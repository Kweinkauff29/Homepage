// BER Wrap Sheet Worker – v4 (cleaned + multi-assign fixes)

const CORS_HEADERS = {
    // You can lock this down later:
    // "Access-Control-Allow-Origin": "https://bonitaesterorealtors.com",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, x-user-email",
};

function json(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json",
            ...CORS_HEADERS,
            ...extraHeaders,
        },
    });
}

async function getBody(request) {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
        try {
            return await request.json();
        } catch {
            return {};
        }
    }
    const text = await request.text();
    if (!text) return {};
    try {
        return JSON.parse(text);
    } catch {
        return {};
    }
}

/* ---------- USERS ---------- */

async function listUsers(env, params) {
    let query = `SELECT id, name, email, role, is_active FROM users WHERE is_active = 1`;
    const args = [];

    if (params && params.get("role")) {
        query += ` AND role = ?`;
        args.push(params.get("role"));
    }

    query += ` ORDER BY name`;

    const { results } = await env.WRAP_DB.prepare(query).bind(...args).all();
    return json(results);
}

/* ---------- DAILY TASK ASSIGNEES (MULTI-ASSIGN) ---------- */

async function replaceTaskAssignees(env, taskId, assigneeIds, primaryAssignedToId) {
    // Normalize and dedupe
    let cleanIds = [];
    if (Array.isArray(assigneeIds)) {
        cleanIds = assigneeIds
            .map((v) => Number(v))
            .filter((v) => Number.isInteger(v) && v > 0);
    }

    async function getTaskByIdShaped(env, id) {
        const { results } = await env.WRAP_DB
            .prepare(
                `
        SELECT
          dt.*,
          u_created.name   AS created_by_name,
          u_created.email  AS created_by_email,
          u_assigned.name  AS assigned_to_name,
          u_assigned.email AS assigned_to_email,
          u_assigner.name  AS assigned_by_name,
          u_assigner.email AS assigned_by_email
        FROM daily_tasks dt
        JOIN users u_created  ON dt.created_by_id  = u_created.id
        JOIN users u_assigned ON dt.assigned_to_id = u_assigned.id
        JOIN users u_assigner ON dt.assigned_by_id = u_assigner.id
        WHERE dt.id = ?
        `
            )
            .bind(id)
            .all();

        if (!results.length) return null;

        const task = { ...results[0], assignees: [], subtasks: [] };

        // assignees
        const assigneesRes = await env.WRAP_DB
            .prepare(
                `
        SELECT u.id AS user_id, u.name, u.email
        FROM daily_task_assignees dta
        JOIN users u ON dta.user_id = u.id
        WHERE dta.task_id = ?
        ORDER BY u.name
        `
            )
            .bind(id)
            .all();

        for (const row of assigneesRes.results) {
            task.assignees.push({ id: row.user_id, name: row.name, email: row.email });
        }

        // fallback if join table empty
        if (!task.assignees.length && task.assigned_to_id) {
            task.assignees.push({
                id: task.assigned_to_id,
                name: task.assigned_to_name,
                email: task.assigned_to_email,
            });
        }

        // subtasks
        const subtasksRes = await env.WRAP_DB
            .prepare(
                `
        SELECT
          s.*,
          u.name  AS assigned_to_name,
          u.email AS assigned_to_email
        FROM daily_task_subtasks s
        LEFT JOIN users u ON s.assigned_to_id = u.id
        WHERE s.task_id = ?
        ORDER BY
          s.due_date IS NULL,
          s.due_date,
          s.id
        `
            )
            .bind(id)
            .all();

        for (const row of subtasksRes.results) {
            task.subtasks.push(row);
        }

        return task;
    }


    const primary = Number(primaryAssignedToId);
    if (Number.isInteger(primary) && primary > 0 && !cleanIds.includes(primary)) {
        cleanIds.push(primary);
    }

    // Clear existing rows
    await env.WRAP_DB
        .prepare(`DELETE FROM daily_task_assignees WHERE task_id = ?`)
        .bind(taskId)
        .run();

    if (!cleanIds.length) return;

    const stmt = env.WRAP_DB.prepare(
        `INSERT INTO daily_task_assignees (task_id, user_id) VALUES (?, ?)`
    );

    for (const uid of cleanIds) {
        await stmt.bind(taskId, uid).run();
    }
}

async function replaceProjectStepAssignees(env, stepId, assigneeIds, primaryAssignedToId) {
    let cleanIds = [];
    if (Array.isArray(assigneeIds)) {
        cleanIds = assigneeIds
            .map((v) => Number(v))
            .filter((v) => Number.isInteger(v) && v > 0);
    }

    // Always include primary
    const primary = Number(primaryAssignedToId);
    if (Number.isInteger(primary) && primary > 0 && !cleanIds.includes(primary)) {
        cleanIds.push(primary);
    }

    // Clear existing
    await env.WRAP_DB
        .prepare(`DELETE FROM project_step_assignees WHERE step_id = ?`)
        .bind(stepId)
        .run();

    if (!cleanIds.length) return;

    const stmt = env.WRAP_DB.prepare(
        `INSERT INTO project_step_assignees (step_id, user_id) VALUES (?, ?)`
    );

    for (const uid of cleanIds) {
        await stmt.bind(stepId, uid).run();
    }
}

/* ---------- DAILY TASKS ---------- */

async function listDailyTasks(env, searchParams) {
    try {
        const monthKey = searchParams.get("month"); // '2025-12'
        const assignedToIdRaw = searchParams.get("assignedToId");

        if (!monthKey) {
            return json({ error: "month query param required (YYYY-MM)" }, 400);
        }

        let assignedToId = null;
        if (assignedToIdRaw) {
            const n = Number(assignedToIdRaw);
            if (!Number.isInteger(n) || n <= 0) {
                return json({ error: "assignedToId must be a positive integer" }, 400);
            }
            assignedToId = n;
        }

        const start = `${monthKey}-01`;
        const end = `${monthKey}-31`;

        let query = `
    SELECT
      dt.*,
      u_created.name   AS created_by_name,
      u_assigned.name  AS assigned_to_name,
      u_assigned.email AS assigned_to_email,
      u_assigner.name  AS assigned_by_name,
      u_assigner.email AS assigned_by_email
    FROM daily_tasks dt
    LEFT JOIN users u_created  ON dt.created_by_id  = u_created.id
    LEFT JOIN users u_assigned ON dt.assigned_to_id = u_assigned.id
    LEFT JOIN users u_assigner ON dt.assigned_by_id = u_assigner.id
    WHERE dt.task_date BETWEEN ? AND ?
  `;
        const params = [start, end];

        if (assignedToId) {
            // Show tasks where:
            // - they are the primary assigned_to_id, OR
            // - they appear in the multi-assignee join table
            query += `
      AND (
        dt.assigned_to_id = ?
        OR EXISTS (
          SELECT 1
          FROM daily_task_assignees dta
          WHERE dta.task_id = dt.id
            AND dta.user_id = ?
        )
      )
    `;
            params.push(assignedToId, assignedToId);
        }

        query += " ORDER BY dt.task_date, dt.id";

        const { results } = await env.WRAP_DB.prepare(query).bind(...params).all();

        if (!results.length) {
            return json([]);
        }

        // Start shaping tasks
        const tasks = results.map((row) => ({
            ...row,
            assignees: [],
            subtasks: [],
        }));

        const taskIds = tasks.map((t) => t.id);
        const byId = new Map();
        for (const t of tasks) byId.set(t.id, t);

        // Batch size to avoid SQLite variable limit (max 999)
        const BATCH_SIZE = 100;

        // ---- Load assignees in batches ----
        for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
            const batch = taskIds.slice(i, i + BATCH_SIZE);
            const placeholders = batch.map(() => "?").join(", ");
            const assigneesRes = await env.WRAP_DB
                .prepare(
                    `
          SELECT
            dta.task_id,
            u.id    AS user_id,
            u.name  AS name,
            u.email AS email
          FROM daily_task_assignees dta
          JOIN users u ON dta.user_id = u.id
          WHERE dta.task_id IN (${placeholders})
          ORDER BY u.name
          `
                )
                .bind(...batch)
                .all();

            for (const row of assigneesRes.results) {
                const parent = byId.get(row.task_id);
                if (parent) {
                    parent.assignees.push({
                        id: row.user_id,
                        name: row.name,
                        email: row.email,
                    });
                }
            }
        }

        // Fallback for any tasks not in the join table yet
        for (const t of tasks) {
            if (!t.assignees.length && t.assigned_to_id) {
                t.assignees.push({
                    id: t.assigned_to_id,
                    name: t.assigned_to_name,
                    email: t.assigned_to_email,
                });
            }
        }

        // ---- Load subtasks in batches ----
        for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
            const batch = taskIds.slice(i, i + BATCH_SIZE);
            const placeholders = batch.map(() => "?").join(", ");
            const subtasksRes = await env.WRAP_DB
                .prepare(
                    `
          SELECT
            s.*,
            u.name  AS assigned_to_name,
            u.email AS assigned_to_email
          FROM daily_task_subtasks s
          LEFT JOIN users u ON s.assigned_to_id = u.id
          WHERE s.task_id IN (${placeholders})
          ORDER BY
            s.due_date IS NULL,  -- non-null due dates first
            s.due_date,
            s.id
          `
                )
                .bind(...batch)
                .all();

            for (const row of subtasksRes.results) {
                const parent = byId.get(row.task_id);
                if (!parent) continue;
                const { task_id, ...rest } = row;
                parent.subtasks.push(rest);
            }
        }

        return json(tasks);
    } catch (err) {
        console.error("listDailyTasks error:", err);
        return json({ error: "Internal server error", details: err.message }, 500);
    }
}

async function createDailyTask(request, env) {
    const body = await getBody(request);

    console.log("createDailyTask body:", body);

    let {
        title,
        notes,
        task_date,
        task_time, // optional "HH:MM" format for scheduled time reminders
        status, // optional status - defaults to 'pending'
        created_by_id,
        assigned_to_id,
        assigned_by_id,
        assignee_ids, // optional array of user IDs for multi-assign
    } = body || {};

    // --- NEW: Auth / Look up user from header ---
    const userEmail = request.headers.get("x-user-email");
    if (userEmail) {
        // Find user by email
        const userRes = await env.WRAP_DB
            .prepare("SELECT id FROM users WHERE email = ?")
            .bind(userEmail)
            .first();

        if (userRes) {
            created_by_id = userRes.id;
            assigned_by_id = userRes.id; // Self-assigned via sync
            // validation logic below will double check IDs
        } else {
            console.warn("createDailyTask: x-user-email provided but user not found", userEmail);
            return json({ error: "User not found for provided email" }, 401);
        }
    } else if (created_by_id == null || assigned_by_id == null) {
        // If not provided in body AND no header, we fail
        // (This preserves original behavior for direct API calls that might send IDs in body)
    }

    const missing = [];
    if (!title) missing.push("title");
    if (!task_date) missing.push("task_date");
    if (created_by_id == null) missing.push("created_by_id");
    if (assigned_to_id == null) missing.push("assigned_to_id");
    if (assigned_by_id == null) missing.push("assigned_by_id");

    if (missing.length) {
        console.log("Missing fields in createDailyTask:", missing, "body:", body, "header:", userEmail);
        return json({ error: "Missing required fields", missing }, 400);
    }

    // Normalize types
    title = String(title);
    notes = notes == null ? "" : String(notes);

    created_by_id = Number(created_by_id);
    assigned_to_id = Number(assigned_to_id);
    assigned_by_id = Number(assigned_by_id);

    // Extra guard against NaN / non-finite
    if (
        !Number.isInteger(created_by_id) ||
        !Number.isInteger(assigned_to_id) ||
        !Number.isInteger(assigned_by_id)
    ) {
        console.log("Bad numeric IDs in createDailyTask:", {
            created_by_id,
            assigned_to_id,
            assigned_by_id,
        });
        return json({ error: "Invalid user ID(s) supplied" }, 400);
    }

    const now = new Date().toISOString();

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'done', 'could_not_complete'];
    const normalizedStatus = validStatuses.includes(status) ? status : 'pending';

    const values = [
        title,          // 1
        notes,          // 2
        task_date,      // 3
        task_time || null, // 4 - optional scheduled time
        created_by_id,  // 5
        assigned_to_id, // 6
        assigned_by_id, // 7
        now,            // 8 assigned_at
        normalizedStatus, // 9 status
        now,            // 10 created_at
        now,            // 11 updated_at
    ];

    // HARD GUARD: if anything is still undefined, we bail before D1
    values.forEach((v, i) => {
        if (v === undefined) {
            throw new Error("Internal: undefined bind value at index " + i);
        }
    });

    console.log("createDailyTask values:", values);

    const stmt = env.WRAP_DB.prepare(`
    INSERT INTO daily_tasks
      (title, notes, task_date, task_time,
       created_by_id, assigned_to_id, assigned_by_id,
       assigned_at, status, completion_notified,
       created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);

    const info = await stmt.bind(...values).run();
    console.log("createDailyTask run meta:", info.meta);

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        console.log("createDailyTask: missing inserted id meta", info);
        return json({ error: "Could not determine inserted id" }, 500);
    }

    // Ensure the join table reflects all assignees (including primary)
    await replaceTaskAssignees(env, insertedId, assignee_ids, assigned_to_id);

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM daily_tasks WHERE id = ?`)
        .bind(insertedId)
        .all();

    return json(results[0], 201);
}

async function updateDailyTask(request, env, id, ctx) {
    const body = await getBody(request);
    const assignee_ids = body.assignee_ids; // optional array for multi-assign updates

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM daily_tasks WHERE id = ?`)
        .bind(id)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Task not found" }, 404);
    }

    const existing = existingRes.results[0];

    const title = body.title ?? existing.title;
    const notes = body.notes ?? existing.notes;
    const task_date = body.task_date ?? existing.task_date;
    const task_time = body.task_time !== undefined ? body.task_time : existing.task_time; // Allow null to clear time

    let assigned_to_id = body.assigned_to_id ?? existing.assigned_to_id;
    assigned_to_id = Number(assigned_to_id);
    if (!Number.isInteger(assigned_to_id)) {
        return json({ error: "Invalid assigned_to_id" }, 400);
    }

    const status = body.status ?? existing.status;
    const nowIso = new Date().toISOString();

    let completed_at = existing.completed_at;
    let completion_notified = existing.completion_notified;

    const statusChangedToDone = existing.status !== "done" && status === "done";
    if (statusChangedToDone) {
        completed_at = nowIso;
        completion_notified = 0;
    }

    await env.WRAP_DB
        .prepare(`
      UPDATE daily_tasks
      SET title = ?, notes = ?, task_date = ?, task_time = ?, assigned_to_id = ?, status = ?,
          completed_at = ?, completion_notified = ?, updated_at = ?
      WHERE id = ?
    `)
        .bind(
            title,
            notes,
            task_date,
            task_time,
            assigned_to_id,
            status,
            completed_at,
            completion_notified,
            nowIso,
            id
        )
        .run();

    const { results } = await env.WRAP_DB
        .prepare(`
      SELECT
        dt.*,
        assigner.email AS assigned_by_email,
        assigner.name  AS assigned_by_name
      FROM daily_tasks dt
      JOIN users assigner ON dt.assigned_by_id = assigner.id
      WHERE dt.id = ?
    `)
        .bind(id)
        .all();

    const updated = results[0];

    // Keep multi-assignee join table in sync
    await replaceTaskAssignees(env, id, assignee_ids, assigned_to_id);

    if (statusChangedToDone && updated.assigned_by_id !== updated.assigned_to_id) {
        ctx.waitUntil(
            sendCompletionEmail(env, updated).catch((err) =>
                console.error("Error sending completion email", err)
            )
        );
        await env.WRAP_DB
            .prepare(`UPDATE daily_tasks SET completion_notified = 1 WHERE id = ?`)
            .bind(id)
            .run();
        updated.completion_notified = 1;
    }

    // Auto-update linked goal subtask when task is marked done
    if (statusChangedToDone) {
        const linkedSubtaskRes = await env.WRAP_DB
            .prepare(`SELECT * FROM goal_subtasks WHERE linked_task_id = ?`)
            .bind(id)
            .all();

        if (linkedSubtaskRes.results.length) {
            const linkedSubtask = linkedSubtaskRes.results[0];
            // Mark subtask done
            await env.WRAP_DB
                .prepare(`UPDATE goal_subtasks SET status = 'done', completed_at = ?, updated_at = ? WHERE id = ?`)
                .bind(nowIso, nowIso, linkedSubtask.id)
                .run();
            // Recalculate goal progress
            await recalculateGoalProgress(env, linkedSubtask.goal_type, linkedSubtask.goal_id);
        }
    }

    return json(updated);
}

/* ---------- DAILY TASK SUBTASKS ---------- */

async function createDailySubtask(request, env, taskId) {
    const body = await getBody(request);
    const {
        title,
        notes = "",
        due_date = null,
        status = "pending",
        assigned_to_id = null,
    } = body || {};

    if (!title) {
        return json({ error: "title is required" }, 400);
    }

    // Make sure parent exists
    const parentRes = await env.WRAP_DB
        .prepare(`SELECT id FROM daily_tasks WHERE id = ?`)
        .bind(taskId)
        .all();

    if (!parentRes.results.length) {
        return json({ error: "Parent task not found" }, 404);
    }

    let assignedToIdVal = assigned_to_id;
    if (assignedToIdVal !== null && assignedToIdVal !== undefined) {
        assignedToIdVal = Number(assignedToIdVal);
        if (!Number.isInteger(assignedToIdVal)) {
            return json({ error: "Invalid assigned_to_id" }, 400);
        }
    }

    const now = new Date().toISOString();

    const info = await env.WRAP_DB
        .prepare(
            `
      INSERT INTO daily_task_subtasks
        (task_id, title, notes, due_date, status, assigned_to_id,
         created_at, updated_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
      `
        )
        .bind(
            Number(taskId),
            String(title),
            String(notes),
            due_date || null,
            String(status || "pending"),
            assignedToIdVal,
            now,
            now
        )
        .run();

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        return json({ error: "Could not determine inserted id" }, 500);
    }

    const { results } = await env.WRAP_DB
        .prepare(
            `
      SELECT
        s.*,
        u.name  AS assigned_to_name,
        u.email AS assigned_to_email
      FROM daily_task_subtasks s
      LEFT JOIN users u ON s.assigned_to_id = u.id
      WHERE s.id = ?
      `
        )
        .bind(insertedId)
        .all();

    return json(results[0], 201);
}

async function updateDailySubtask(request, env, subtaskId) {
    const body = await getBody(request);

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM daily_task_subtasks WHERE id = ?`)
        .bind(subtaskId)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Subtask not found" }, 404);
    }

    const existing = existingRes.results[0];

    const title = body.title ?? existing.title;
    const notes = body.notes ?? existing.notes;
    const due_date = body.due_date !== undefined ? body.due_date : existing.due_date;
    const status = body.status ?? existing.status;

    let assigned_to_id =
        body.assigned_to_id !== undefined ? body.assigned_to_id : existing.assigned_to_id;

    if (assigned_to_id !== null && assigned_to_id !== undefined) {
        assigned_to_id = Number(assigned_to_id);
        if (!Number.isInteger(assigned_to_id)) {
            return json({ error: "Invalid assigned_to_id" }, 400);
        }
    }

    const now = new Date().toISOString();
    let completed_at = existing.completed_at;

    if (existing.status !== "done" && status === "done") {
        completed_at = now;
    } else if (existing.status === "done" && status !== "done") {
        completed_at = null;
    }

    await env.WRAP_DB
        .prepare(
            `
      UPDATE daily_task_subtasks
      SET title = ?, notes = ?, due_date = ?, status = ?,
          assigned_to_id = ?, completed_at = ?, updated_at = ?
      WHERE id = ?
      `
        )
        .bind(
            String(title),
            String(notes),
            due_date || null,
            String(status),
            assigned_to_id,
            completed_at,
            now,
            subtaskId
        )
        .run();

    const { results } = await env.WRAP_DB
        .prepare(
            `
      SELECT
        s.*,
        u.name  AS assigned_to_name,
        u.email AS assigned_to_email
      FROM daily_task_subtasks s
      LEFT JOIN users u ON s.assigned_to_id = u.id
      WHERE s.id = ?
      `
        )
        .bind(subtaskId)
        .all();

    return json(results[0]);
}

/* ---------- MONTHLY GOALS ---------- */

async function listMonthlyGoals(env, searchParams) {
    const monthKey = searchParams.get("month");
    const ownerIdRaw = searchParams.get("ownerId");

    if (!monthKey) {
        return json({ error: "month query param required" }, 400);
    }

    let ownerId = null;
    if (ownerIdRaw) {
        const n = Number(ownerIdRaw);
        if (!Number.isInteger(n) || n <= 0) {
            return json({ error: "ownerId must be a positive integer" }, 400);
        }
        ownerId = n;
    }

    let query = `
    SELECT mg.*, u.name AS owner_name, u.email AS owner_email
    FROM monthly_goals mg
    JOIN users u ON mg.owner_id = u.id
    WHERE mg.month_key = ?
  `;
    const params = [monthKey];

    if (ownerId) {
        query += " AND mg.owner_id = ?";
        params.push(ownerId);
    }

    query += " ORDER BY mg.category, mg.id";

    const { results } = await env.WRAP_DB.prepare(query).bind(...params).all();
    return json(results);
}

async function createMonthlyGoal(request, env) {
    const body = await getBody(request);
    const { owner_id, month_key, category, title, description = "" } = body;

    if (!owner_id || !month_key || !category || !title) {
        return json({ error: "Missing required fields" }, 400);
    }

    const now = new Date().toISOString();

    const info = await env.WRAP_DB
        .prepare(`
      INSERT INTO monthly_goals
        (owner_id, month_key, category, title, description,
         progress_percent, progress_note, is_complete,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, '', 0, ?, ?)
    `)
        .bind(owner_id, month_key, category, title, description, now, now)
        .run();

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        console.log("createMonthlyGoal: missing inserted id meta", info);
        return json({ error: "Could not determine inserted id" }, 500);
    }

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM monthly_goals WHERE id = ?`)
        .bind(insertedId)
        .all();

    return json(results[0], 201);
}

async function updateMonthlyGoal(request, env, id) {
    const body = await getBody(request);

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM monthly_goals WHERE id = ?`)
        .bind(id)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Goal not found" }, 404);
    }

    const existing = existingRes.results[0];
    const now = new Date().toISOString();

    const title = body.title ?? existing.title;
    const description = body.description ?? existing.description;
    const progress_percent =
        body.progress_percent !== undefined ? body.progress_percent : existing.progress_percent;
    const progress_note = body.progress_note ?? existing.progress_note;
    const is_complete =
        body.is_complete !== undefined ? (body.is_complete ? 1 : 0) : existing.is_complete;

    await env.WRAP_DB
        .prepare(
            `UPDATE monthly_goals
       SET title = ?, description = ?, progress_percent = ?, progress_note = ?, is_complete = ?, updated_at = ?
       WHERE id = ?`
        )
        .bind(title, description, progress_percent, progress_note, is_complete, now, id)
        .run();

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM monthly_goals WHERE id = ?`)
        .bind(id)
        .all();

    return json(results[0]);
}

/* ---------- ANNUAL GOALS ---------- */

async function listAnnualGoals(env, searchParams) {
    const year = searchParams.get("year");
    const ownerIdRaw = searchParams.get("ownerId");

    if (!year) {
        return json({ error: "year query param required" }, 400);
    }

    let ownerId = null;
    if (ownerIdRaw) {
        const n = Number(ownerIdRaw);
        if (!Number.isInteger(n) || n <= 0) {
            return json({ error: "ownerId must be a positive integer" }, 400);
        }
        ownerId = n;
    }

    let query = `
    SELECT ag.*, u.name AS owner_name, u.email AS owner_email
    FROM annual_goals ag
    JOIN users u ON ag.owner_id = u.id
    WHERE ag.year = ?
  `;
    const params = [year];

    if (ownerId) {
        query += " AND ag.owner_id = ?";
        params.push(ownerId);
    }

    query += " ORDER BY ag.category, ag.id";

    const { results } = await env.WRAP_DB.prepare(query).bind(...params).all();
    return json(results);
}

async function createAnnualGoal(request, env) {
    const body = await getBody(request);
    const { owner_id, year, category, title, description = "" } = body;

    if (!owner_id || !year || !category || !title) {
        return json({ error: "Missing required fields" }, 400);
    }

    const now = new Date().toISOString();

    const info = await env.WRAP_DB
        .prepare(`
      INSERT INTO annual_goals
        (owner_id, year, category, title, description,
         progress_percent, progress_note, is_complete,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, '', 0, ?, ?)
    `)
        .bind(owner_id, year, category, title, description, now, now)
        .run();

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        console.log("createAnnualGoal: missing inserted id meta", info);
        return json({ error: "Could not determine inserted id" }, 500);
    }

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM annual_goals WHERE id = ?`)
        .bind(insertedId)
        .all();

    return json(results[0], 201);
}

async function updateAnnualGoal(request, env, id) {
    const body = await getBody(request);

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM annual_goals WHERE id = ?`)
        .bind(id)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Goal not found" }, 404);
    }

    const existing = existingRes.results[0];
    const now = new Date().toISOString();

    const title = body.title ?? existing.title;
    const description = body.description ?? existing.description;
    const progress_percent =
        body.progress_percent !== undefined ? body.progress_percent : existing.progress_percent;
    const progress_note = body.progress_note ?? existing.progress_note;
    const is_complete =
        body.is_complete !== undefined ? (body.is_complete ? 1 : 0) : existing.is_complete;

    await env.WRAP_DB
        .prepare(
            `UPDATE annual_goals
       SET title = ?, description = ?, progress_percent = ?, progress_note = ?, is_complete = ?, updated_at = ?
       WHERE id = ?`
        )
        .bind(title, description, progress_percent, progress_note, is_complete, now, id)
        .run();

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM annual_goals WHERE id = ?`)
        .bind(id)
        .all();

    return json(results[0]);
}

/* ---------- GOAL CATEGORIES ---------- */

async function listGoalCategories(env, searchParams) {
    const type = searchParams.get("type"); // 'monthly' or 'annual'
    const period = searchParams.get("period"); // '2025-01' or '2025'
    const ownerIdRaw = searchParams.get("ownerId");

    if (!type || !period) {
        return json({ error: "type and period query params required" }, 400);
    }

    let ownerId = null;
    if (ownerIdRaw) {
        const n = Number(ownerIdRaw);
        if (!Number.isInteger(n) || n <= 0) {
            return json({ error: "ownerId must be a positive integer" }, 400);
        }
        ownerId = n;
    }

    let query = `
        SELECT * FROM goal_categories
        WHERE type = ? AND period_key = ?
    `;
    const params = [type, period];

    if (ownerId) {
        query += " AND owner_id = ?";
        params.push(ownerId);
    }

    query += " ORDER BY display_order, id";

    const { results } = await env.WRAP_DB.prepare(query).bind(...params).all();
    return json(results);
}

async function createGoalCategory(request, env) {
    const body = await getBody(request);
    const { type, period_key, original_name, custom_name = null, owner_id, display_order = 0 } = body;

    if (!type || !period_key || !original_name || !owner_id) {
        return json({ error: "Missing required fields: type, period_key, original_name, owner_id" }, 400);
    }

    const now = new Date().toISOString();

    const info = await env.WRAP_DB
        .prepare(`
            INSERT INTO goal_categories
                (type, period_key, original_name, custom_name, owner_id, display_order, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(type, period_key, original_name, custom_name, owner_id, display_order, now, now)
        .run();

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        return json({ error: "Could not determine inserted id" }, 500);
    }

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM goal_categories WHERE id = ?`)
        .bind(insertedId)
        .all();

    return json(results[0], 201);
}

async function updateGoalCategory(request, env, id) {
    const body = await getBody(request);

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM goal_categories WHERE id = ?`)
        .bind(id)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Category not found" }, 404);
    }

    const existing = existingRes.results[0];
    const now = new Date().toISOString();

    const custom_name = body.custom_name !== undefined ? body.custom_name : existing.custom_name;
    const display_order = body.display_order !== undefined ? body.display_order : existing.display_order;

    await env.WRAP_DB
        .prepare(`UPDATE goal_categories SET custom_name = ?, display_order = ?, updated_at = ? WHERE id = ?`)
        .bind(custom_name, display_order, now, id)
        .run();

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM goal_categories WHERE id = ?`)
        .bind(id)
        .all();

    return json(results[0]);
}

/* ---------- GOAL SUBTASKS ---------- */

async function listGoalSubtasks(env, goalType, goalId) {
    const { results } = await env.WRAP_DB
        .prepare(`
            SELECT gs.*, dt.title AS linked_task_title, dt.status AS linked_task_status
            FROM goal_subtasks gs
            LEFT JOIN daily_tasks dt ON gs.linked_task_id = dt.id
            WHERE gs.goal_type = ? AND gs.goal_id = ?
            ORDER BY gs.id
        `)
        .bind(goalType, goalId)
        .all();

    return json(results);
}

async function createGoalSubtask(request, env, goalType, goalId) {
    const body = await getBody(request);
    const { title, notes = "", weight = 1 } = body;

    if (!title) {
        return json({ error: "title is required" }, 400);
    }

    // Verify goal exists
    const tableName = goalType === 'monthly' ? 'monthly_goals' : 'annual_goals';
    const goalRes = await env.WRAP_DB
        .prepare(`SELECT id FROM ${tableName} WHERE id = ?`)
        .bind(goalId)
        .all();

    if (!goalRes.results.length) {
        return json({ error: "Goal not found" }, 404);
    }

    const now = new Date().toISOString();

    const info = await env.WRAP_DB
        .prepare(`
            INSERT INTO goal_subtasks
                (goal_type, goal_id, title, notes, status, weight, linked_task_id, created_at, updated_at, completed_at)
            VALUES (?, ?, ?, ?, 'pending', ?, NULL, ?, ?, NULL)
        `)
        .bind(goalType, goalId, title, notes, weight, now, now)
        .run();

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        return json({ error: "Could not determine inserted id" }, 500);
    }

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM goal_subtasks WHERE id = ?`)
        .bind(insertedId)
        .all();

    return json(results[0], 201);
}

async function updateGoalSubtask(request, env, subtaskId) {
    const body = await getBody(request);

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM goal_subtasks WHERE id = ?`)
        .bind(subtaskId)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Subtask not found" }, 404);
    }

    const existing = existingRes.results[0];
    const now = new Date().toISOString();

    const title = body.title ?? existing.title;
    const notes = body.notes ?? existing.notes;
    const status = body.status ?? existing.status;
    const weight = body.weight !== undefined ? body.weight : existing.weight;

    let completed_at = existing.completed_at;
    if (existing.status !== "done" && status === "done") {
        completed_at = now;
    } else if (existing.status === "done" && status !== "done") {
        completed_at = null;
    }

    await env.WRAP_DB
        .prepare(`
            UPDATE goal_subtasks
            SET title = ?, notes = ?, status = ?, weight = ?, completed_at = ?, updated_at = ?
            WHERE id = ?
        `)
        .bind(title, notes, status, weight, completed_at, now, subtaskId)
        .run();

    // Recalculate goal progress if status changed
    if (existing.status !== status) {
        await recalculateGoalProgress(env, existing.goal_type, existing.goal_id);
    }

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM goal_subtasks WHERE id = ?`)
        .bind(subtaskId)
        .all();

    return json(results[0]);
}

async function deleteGoalSubtask(env, subtaskId) {
    // Get subtask info first for recalculation
    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM goal_subtasks WHERE id = ?`)
        .bind(subtaskId)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Subtask not found" }, 404);
    }

    const existing = existingRes.results[0];

    await env.WRAP_DB
        .prepare(`DELETE FROM goal_subtasks WHERE id = ?`)
        .bind(subtaskId)
        .run();

    // Recalculate goal progress after deletion
    await recalculateGoalProgress(env, existing.goal_type, existing.goal_id);

    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function addGoalSubtaskToCalendar(request, env, subtaskId) {
    const body = await getBody(request);
    const { task_date, assigned_to_id, assigned_by_id, created_by_id } = body;

    if (!task_date || !assigned_to_id) {
        return json({ error: "task_date and assigned_to_id are required" }, 400);
    }

    // Get subtask
    const subtaskRes = await env.WRAP_DB
        .prepare(`SELECT * FROM goal_subtasks WHERE id = ?`)
        .bind(subtaskId)
        .all();

    if (!subtaskRes.results.length) {
        return json({ error: "Subtask not found" }, 404);
    }

    const subtask = subtaskRes.results[0];

    // Get goal title for context
    const tableName = subtask.goal_type === 'monthly' ? 'monthly_goals' : 'annual_goals';
    const goalRes = await env.WRAP_DB
        .prepare(`SELECT title FROM ${tableName} WHERE id = ?`)
        .bind(subtask.goal_id)
        .all();

    const goalTitle = goalRes.results[0]?.title || 'Goal';
    const taskTitle = `🎯 ${goalTitle}: ${subtask.title}`;

    const now = new Date().toISOString();

    // Create daily task
    const taskInfo = await env.WRAP_DB
        .prepare(`
            INSERT INTO daily_tasks
                (title, notes, task_date, created_by_id, assigned_to_id, assigned_by_id,
                 assigned_at, status, completion_notified, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)
        `)
        .bind(
            taskTitle,
            subtask.notes || '',
            task_date,
            created_by_id || assigned_by_id || assigned_to_id,
            assigned_to_id,
            assigned_by_id || assigned_to_id,
            now,
            now,
            now
        )
        .run();

    const taskId = taskInfo.meta?.last_row_id;
    if (!taskId) {
        return json({ error: "Could not create task" }, 500);
    }

    // Link subtask to task
    await env.WRAP_DB
        .prepare(`UPDATE goal_subtasks SET linked_task_id = ?, updated_at = ? WHERE id = ?`)
        .bind(taskId, now, subtaskId)
        .run();

    // Return the created task
    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM daily_tasks WHERE id = ?`)
        .bind(taskId)
        .all();

    return json({ task: results[0], subtask_id: subtaskId }, 201);
}

/* ---------- GOAL PROGRESS CALCULATION ---------- */

async function recalculateGoalProgress(env, goalType, goalId) {
    // Count total weight and completed weight
    const statsRes = await env.WRAP_DB
        .prepare(`
            SELECT
                COALESCE(SUM(weight), 0) as total_weight,
                COALESCE(SUM(CASE WHEN status = 'done' THEN weight ELSE 0 END), 0) as done_weight
            FROM goal_subtasks
            WHERE goal_type = ? AND goal_id = ?
        `)
        .bind(goalType, goalId)
        .all();

    const stats = statsRes.results[0] || { total_weight: 0, done_weight: 0 };
    const total = Number(stats.total_weight) || 0;
    const done = Number(stats.done_weight) || 0;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;

    const tableName = goalType === 'monthly' ? 'monthly_goals' : 'annual_goals';
    const now = new Date().toISOString();

    await env.WRAP_DB
        .prepare(`UPDATE ${tableName} SET progress_percent = ?, updated_at = ? WHERE id = ?`)
        .bind(percent, now, goalId)
        .run();

    return percent;
}

/* ---------- PROJECTS ---------- */

async function listProjects(env) {
    const { results } = await env.WRAP_DB
        .prepare(`
            SELECT p.*, u.name AS created_by_name
            FROM projects p
            JOIN users u ON p.created_by_id = u.id
            WHERE p.status != 'archived'
            ORDER BY p.created_at DESC
        `)
        .all();

    // Eagerly load steps for all projects
    if (results.length > 0) {
        const projectIds = results.map(p => p.id);
        const placeholders = projectIds.map(() => "?").join(", ");

        // Fetch ALL steps for these projects
        const allStepsRes = await env.WRAP_DB
            .prepare(`
                SELECT 
                    s.*, 
                    u.name AS assigned_to_name, 
                    u.email AS assigned_to_email
                FROM project_steps s
                LEFT JOIN users u ON s.assigned_to_id = u.id
                WHERE s.project_id IN (${placeholders})
                ORDER BY s.project_id, s.step_order, s.id
            `)
            .bind(...projectIds)
            .all();

        const allSteps = allStepsRes.results;

        // Group steps by project
        const stepsMap = new Map(); // projectId -> [steps]
        for (const s of allSteps) {
            if (!stepsMap.has(s.project_id)) stepsMap.set(s.project_id, []);
            stepsMap.get(s.project_id).push(s);
        }

        // Fetch ALL step assignees for these steps (if any)
        // Optimization: only fetch if there are steps
        if (allSteps.length > 0) {
            const stepIds = allSteps.map(s => s.id);
            // Chunking might be needed if too many steps, but assume manageable for now or chunk 100?
            // SQLite limit is usually high enough for hundreds of steps. 
            // If joint projects grow huge, this needs pagination.

            const stepPlaceholders = stepIds.map(() => "?").join(", ");
            const assigneesRes = await env.WRAP_DB
                .prepare(`
                    SELECT psa.step_id, u.id, u.name, u.email
                    FROM project_step_assignees psa
                    JOIN users u ON psa.user_id = u.id
                    WHERE psa.step_id IN (${stepPlaceholders})
                `)
                .bind(...stepIds)
                .all();

            const assigneesMap = new Map(); // stepId -> [users]
            for (const row of assigneesRes.results) {
                if (!assigneesMap.has(row.step_id)) assigneesMap.set(row.step_id, []);
                assigneesMap.get(row.step_id).push(row);
            }

            // Hydrate steps with assignees
            for (const s of allSteps) {
                s.assignees = assigneesMap.get(s.id) || [];
                // Fallback to primary if empty
                if (s.assignees.length === 0 && s.assigned_to_id) {
                    s.assignees.push({
                        id: s.assigned_to_id,
                        name: s.assigned_to_name,
                        email: s.assigned_to_email
                    });
                }
            }
        }

        // Attach steps to projects & calc stats
        for (const project of results) {
            project.steps = stepsMap.get(project.id) || [];
            project.total_steps = project.steps.length;
            project.completed_steps = project.steps.filter(s => s.status === 'done').length;
            project.progress_percent = project.total_steps > 0
                ? Math.round((project.completed_steps / project.total_steps) * 100)
                : 0;
        }
    }

    return json(results);
}

async function getProjectWithSteps(env, projectId) {
    const { results } = await env.WRAP_DB
        .prepare(`
            SELECT p.*, u.name AS created_by_name
            FROM projects p
            JOIN users u ON p.created_by_id = u.id
            WHERE p.id = ?
        `)
        .bind(projectId)
        .all();

    if (!results.length) {
        return json({ error: "Project not found" }, 404);
    }

    const project = results[0];

    // Get steps with assignee info
    const stepsRes = await env.WRAP_DB
        .prepare(`
            SELECT s.*, u.name AS assigned_to_name, u.email AS assigned_to_email
            FROM project_steps s
            LEFT JOIN users u ON s.assigned_to_id = u.id
            WHERE s.project_id = ?
            ORDER BY s.step_order, s.id
        `)
        .bind(projectId)
        .all();

    project.steps = stepsRes.results;
    project.total_steps = project.steps.length;
    project.completed_steps = project.steps.filter(s => s.status === 'done').length;
    project.progress_percent = project.total_steps > 0
        ? Math.round((project.completed_steps / project.total_steps) * 100)
        : 0;

    return json(project);
}

async function createProject(request, env) {
    const body = await getBody(request);
    const { title, description = "", created_by_id, waiting_on = "", blocking_task = "" } = body;

    if (!title || !created_by_id) {
        return json({ error: "title and created_by_id are required" }, 400);
    }

    const now = new Date().toISOString();

    const info = await env.WRAP_DB
        .prepare(`
            INSERT INTO projects (title, description, created_by_id, status, created_at, updated_at, waiting_on, blocking_task)
            VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
        `)
        .bind(title, description, created_by_id, now, now, waiting_on, blocking_task)
        .run();

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        return json({ error: "Could not determine inserted id" }, 500);
    }

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM projects WHERE id = ?`)
        .bind(insertedId)
        .all();

    return json(results[0], 201);
}

async function updateProject(request, env, id) {
    const body = await getBody(request);

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM projects WHERE id = ?`)
        .bind(id)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Project not found" }, 404);
    }

    const existing = existingRes.results[0];
    const now = new Date().toISOString();

    const title = body.title ?? existing.title;
    const description = body.description ?? existing.description;
    const status = body.status ?? existing.status;
    const waiting_on = body.waiting_on ?? existing.waiting_on;
    const blocking_task = body.blocking_task ?? existing.blocking_task;

    await env.WRAP_DB
        .prepare(`UPDATE projects SET title = ?, description = ?, status = ?, updated_at = ?, waiting_on = ?, blocking_task = ? WHERE id = ?`)
        .bind(title, description, status, now, waiting_on, blocking_task, id)
        .run();

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM projects WHERE id = ?`)
        .bind(id)
        .all();

    return json(results[0]);
}

async function deleteProject(env, id) {
    // Delete steps first
    await env.WRAP_DB
        .prepare(`DELETE FROM project_steps WHERE project_id = ?`)
        .bind(id)
        .run();

    await env.WRAP_DB
        .prepare(`DELETE FROM projects WHERE id = ?`)
        .bind(id)
        .run();

    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

async function duplicateProject(request, env, id) {
    // 1. Get original project
    const pRes = await env.WRAP_DB
        .prepare(`SELECT * FROM projects WHERE id = ?`)
        .bind(id)
        .all();

    if (!pRes.results.length) {
        return json({ error: "Project not found" }, 404);
    }
    const origin = pRes.results[0];

    // 2. Get original steps
    const sRes = await env.WRAP_DB
        .prepare(`SELECT * FROM project_steps WHERE project_id = ? ORDER BY step_order, id`)
        .bind(id)
        .all();
    const originSteps = sRes.results;

    const body = await getBody(request);
    const now = new Date().toISOString();

    // 3. Create new project
    const newTitle = body.title || `${origin.title} (Copy)`;

    const info = await env.WRAP_DB
        .prepare(`
            INSERT INTO projects (title, description, created_by_id, status, created_at, updated_at, waiting_on, blocking_task)
            VALUES (?, ?, ?, 'active', ?, ?, '', '')
        `)
        .bind(newTitle, origin.description, origin.created_by_id, now, now)
        .run();

    const newProjectId = info.meta?.last_row_id;
    if (!newProjectId) {
        return json({ error: "Failed to create duplicate project" }, 500);
    }

    // 4. Duplicate steps & assignees
    for (const s of originSteps) {
        const stepInfo = await env.WRAP_DB.prepare(`
            INSERT INTO project_steps 
                (project_id, step_order, title, description, assigned_to_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `)
            .bind(newProjectId, s.step_order, s.title, s.description, s.assigned_to_id, now, now)
            .run();

        const newStepId = stepInfo.meta?.last_row_id;
        if (newStepId) {
            // Copy assignees from project_step_assignees
            await env.WRAP_DB.prepare(`
                INSERT INTO project_step_assignees (step_id, user_id, created_at)
                SELECT ?, user_id, ?
                FROM project_step_assignees
                WHERE step_id = ?
            `)
                .bind(newStepId, now, s.id)
                .run();
        }
    }

    // 5. Return new project
    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM projects WHERE id = ?`)
        .bind(newProjectId)
        .all();

    return json(results[0], 201);
}

/* ---------- PROJECT STEPS ---------- */

async function createProjectStep(request, env, projectId) {
    const body = await getBody(request);
    const { title, description = "", assigned_to_id = null, step_order = 999, assignee_ids = [] } = body;

    if (!title) {
        return json({ error: "title is required" }, 400);
    }

    // Verify project exists
    const projectRes = await env.WRAP_DB
        .prepare(`SELECT id FROM projects WHERE id = ?`)
        .bind(projectId)
        .all();

    if (!projectRes.results.length) {
        return json({ error: "Project not found" }, 404);
    }

    const now = new Date().toISOString();

    const info = await env.WRAP_DB
        .prepare(`
            INSERT INTO project_steps 
                (project_id, step_order, title, description, assigned_to_id, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `)
        .bind(projectId, step_order, title, description, assigned_to_id, now, now)
        .run();

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        return json({ error: "Could not determine inserted id" }, 500);
    }

    // Update step assignees
    await replaceProjectStepAssignees(env, insertedId, assignee_ids, assigned_to_id);

    // Fetch fresh with all data
    const { results } = await env.WRAP_DB
        .prepare(`
            SELECT s.*, u.name AS assigned_to_name
            FROM project_steps s
            LEFT JOIN users u ON s.assigned_to_id = u.id
            WHERE s.id = ?
        `)
        .bind(insertedId)
        .all();

    // Manually attach assignees for response transparency
    // (Or simpler, just return what we have, but cleaner to verify)
    // ... skipping detail re-fetch for brevity, `replace` ensures it's saved.

    return json(results[0], 201);
}

async function updateProjectStep(request, env, stepId) {
    const body = await getBody(request);
    const assignee_ids = body.assignee_ids; // optional array

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM project_steps WHERE id = ?`)
        .bind(stepId)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Step not found" }, 404);
    }

    const existing = existingRes.results[0];
    const now = new Date().toISOString();

    const title = body.title ?? existing.title;
    const description = body.description ?? existing.description;
    const assigned_to_id = body.assigned_to_id !== undefined ? body.assigned_to_id : existing.assigned_to_id;
    const status = body.status ?? existing.status;
    const step_order = body.step_order !== undefined ? body.step_order : existing.step_order;

    let completed_at = existing.completed_at;
    if (existing.status !== "done" && status === "done") {
        completed_at = now;
    } else if (existing.status === "done" && status !== "done") {
        completed_at = null;
    }

    await env.WRAP_DB
        .prepare(`
            UPDATE project_steps 
            SET title = ?, description = ?, assigned_to_id = ?, status = ?, step_order = ?, completed_at = ?, updated_at = ?
            WHERE id = ?
        `)
        .bind(title, description, assigned_to_id, status, step_order, completed_at, now, stepId)
        .run();

    // Update assignees if provided
    if (assignee_ids !== undefined) {
        await replaceProjectStepAssignees(env, stepId, assignee_ids, assigned_to_id);
    }

    const { results } = await env.WRAP_DB
        .prepare(`
            SELECT s.*, u.name AS assigned_to_name
            FROM project_steps s
            LEFT JOIN users u ON s.assigned_to_id = u.id
            WHERE s.id = ?
        `)
        .bind(stepId)
        .all();

    return json(results[0]);
}

async function deleteProjectStep(env, stepId) {
    await env.WRAP_DB
        .prepare(`DELETE FROM project_steps WHERE id = ?`)
        .bind(stepId)
        .run();

    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/* ---------- USER PREFERENCES ---------- */

async function getUserPreferences(env, userId) {
    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM user_preferences WHERE user_id = ?`)
        .bind(userId)
        .all();

    if (results.length === 0) {
        // Return defaults if no prefs exist
        return json({
            user_id: Number(userId),
            theme: "light",
            calendar_view: "month",
            section_order: null,
            enable_weekly_tasks: 0
        });
    }

    return json(results[0]);
}

async function saveUserPreferences(request, env, userId) {
    const body = await getBody(request);
    const now = new Date().toISOString();

    // Check if prefs exist
    const existing = await env.WRAP_DB
        .prepare(`SELECT * FROM user_preferences WHERE user_id = ?`)
        .bind(userId)
        .all();

    if (existing.results.length === 0) {
        // Insert new
        await env.WRAP_DB
            .prepare(`
                INSERT INTO user_preferences (user_id, theme, calendar_view, section_order, enable_weekly_tasks, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `)
            .bind(
                userId,
                body.theme || "light",
                body.calendar_view || "month",
                body.section_order ? JSON.stringify(body.section_order) : null,
                body.enable_weekly_tasks || 0,
                now
            )
            .run();
    } else {
        // Update existing
        await env.WRAP_DB
            .prepare(`
                UPDATE user_preferences 
                SET theme = ?, calendar_view = ?, section_order = ?, enable_weekly_tasks = ?, updated_at = ?
                WHERE user_id = ?
            `)
            .bind(
                body.theme !== undefined ? body.theme : existing.results[0].theme,
                body.calendar_view !== undefined ? body.calendar_view : existing.results[0].calendar_view,
                body.section_order ? JSON.stringify(body.section_order) : existing.results[0].section_order,
                body.enable_weekly_tasks !== undefined ? body.enable_weekly_tasks : existing.results[0].enable_weekly_tasks,
                now,
                userId
            )
            .run();
    }

    return getUserPreferences(env, userId);
}

/* ---------- WEEKLY TASKS (BETA) ---------- */

function getWeekKey(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    // ISO week number calculation
    const thursday = new Date(d.valueOf());
    thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
    const firstThursday = new Date(thursday.getFullYear(), 0, 4);
    const weekNum = 1 + Math.round(
        ((thursday.valueOf() - firstThursday.valueOf()) / 86400000 - 3 +
            ((firstThursday.getDay() + 6) % 7)) / 7
    );
    return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

async function listWeeklyTasks(env, userId, weekKey) {
    const week = weekKey || getWeekKey();

    let query = `
        SELECT t.*, 
               u1.name AS assigned_to_name,
               u2.name AS assigned_by_name
        FROM weekly_tasks t
        JOIN users u1 ON t.assigned_to_id = u1.id
        LEFT JOIN users u2 ON t.assigned_by_id = u2.id
        WHERE t.week_key = ?
    `;
    const params = [week];

    if (userId) {
        query += ` AND t.assigned_to_id = ?`;
        params.push(userId);
    }

    query += ` ORDER BY t.priority DESC, t.created_at`;

    const { results } = await env.WRAP_DB.prepare(query).bind(...params).all();
    return json({ week: week, tasks: results });
}

async function createWeeklyTask(request, env) {
    const body = await getBody(request);
    const { title, notes = "", week_key, assigned_to_id, assigned_by_id = null, priority = 0 } = body;

    if (!title || !week_key || !assigned_to_id) {
        return json({ error: "title, week_key, and assigned_to_id are required" }, 400);
    }

    const now = new Date().toISOString();

    const info = await env.WRAP_DB
        .prepare(`
            INSERT INTO weekly_tasks 
                (title, notes, week_key, assigned_to_id, assigned_by_id, status, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        `)
        .bind(title, notes, week_key, assigned_to_id, assigned_by_id, priority, now, now)
        .run();

    const insertedId = info.meta?.last_row_id;
    if (!insertedId) {
        return json({ error: "Could not determine inserted id" }, 500);
    }

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM weekly_tasks WHERE id = ?`)
        .bind(insertedId)
        .all();

    return json(results[0], 201);
}

async function updateWeeklyTask(request, env, taskId) {
    const body = await getBody(request);

    const existingRes = await env.WRAP_DB
        .prepare(`SELECT * FROM weekly_tasks WHERE id = ?`)
        .bind(taskId)
        .all();

    if (!existingRes.results.length) {
        return json({ error: "Weekly task not found" }, 404);
    }

    const existing = existingRes.results[0];
    const now = new Date().toISOString();

    const title = body.title ?? existing.title;
    const notes = body.notes ?? existing.notes;
    const status = body.status ?? existing.status;
    const priority = body.priority ?? existing.priority;

    let completed_at = existing.completed_at;
    if (existing.status !== "done" && status === "done") {
        completed_at = now;
    } else if (existing.status === "done" && status !== "done") {
        completed_at = null;
    }

    await env.WRAP_DB
        .prepare(`
            UPDATE weekly_tasks 
            SET title = ?, notes = ?, status = ?, priority = ?, completed_at = ?, updated_at = ?
            WHERE id = ?
        `)
        .bind(title, notes, status, priority, completed_at, now, taskId)
        .run();

    const { results } = await env.WRAP_DB
        .prepare(`SELECT * FROM weekly_tasks WHERE id = ?`)
        .bind(taskId)
        .all();

    return json(results[0]);
}

async function deleteWeeklyTask(env, taskId) {
    await env.WRAP_DB
        .prepare(`DELETE FROM weekly_tasks WHERE id = ?`)
        .bind(taskId)
        .run();

    return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/* ---------- MAILCHANNELS EMAIL ---------- */

async function sendCompletionEmail(env, task) {
    const subject = `Task completed: ${task.title}`;
    const text = [
        `Hi ${task.assigned_by_name || "there"},`,
        "",
        `The task you assigned has been marked complete.`,
        "",
        `Task: ${task.title}`,
        `Date Assigned: ${task.assigned_at}`,
        `Date Completed: ${task.completed_at}`,
        "",
        `Notes: ${task.notes || "(none)"}`,
        "",
        `– BER Wrap Sheet`,
    ].join("\n");

    const mailPayload = {
        personalizations: [
            {
                to: [{ email: task.assigned_by_email, name: task.assigned_by_name }],
            },
        ],
        from: {
            email: env.MAIL_FROM,
            name: env.MAIL_FROM_NAME || "BER Wrap Sheet",
        },
        subject,
        content: [{ type: "text/plain", value: text }],
    };

    return fetch("https://api.mailchannels.net/tx/v1/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mailPayload),
    });
}

/* ---------- MAIN DISPATCH ---------- */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const { pathname } = url;
        const searchParams = url.searchParams;

        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        try {
            // ===== USERS =====
            if (pathname === "/api/users" && request.method === "GET") {
                return await listUsers(env, searchParams);
            }
            if (pathname === "/api/users" && request.method === "POST") {
                return await createUser(request, env);
            }

            // ===== DAILY TASKS =====
            if (pathname === "/api/daily-tasks" && request.method === "GET") {
                return await listDailyTasks(env, searchParams);
            }

            if (pathname === "/api/daily-tasks" && request.method === "POST") {
                return await createDailyTask(request, env);
            }

            if (pathname.startsWith("/api/daily-tasks/")) {
                const segments = pathname.split("/");
                const last = segments[segments.length - 1];

                // /api/daily-tasks/:id/subtasks
                if (last === "subtasks") {
                    const taskId = segments[segments.length - 2];

                    if (request.method === "GET") {
                        const { results } = await env.WRAP_DB
                            .prepare(
                                `
                SELECT
                  s.*,
                  u.name  AS assigned_to_name,
                  u.email AS assigned_to_email
                FROM daily_task_subtasks s
                LEFT JOIN users u ON s.assigned_to_id = u.id
                WHERE s.task_id = ?
                ORDER BY
                  s.due_date IS NULL,
                  s.due_date,
                  s.id
                `
                            )
                            .bind(taskId)
                            .all();
                        return json(results);
                    }

                    if (request.method === "POST") {
                        return await createDailySubtask(request, env, taskId);
                    }
                } else {
                    // /api/daily-tasks/:id
                    const id = last;

                    if (request.method === "PATCH") {
                        return await updateDailyTask(request, env, id, ctx);
                    }

                    if (request.method === "DELETE") {
                        // Clean up dependent rows first (prevents orphan data)
                        await env.WRAP_DB
                            .prepare(`DELETE FROM daily_task_assignees WHERE task_id = ?`)
                            .bind(id)
                            .run();
                        await env.WRAP_DB
                            .prepare(`DELETE FROM daily_task_subtasks WHERE task_id = ?`)
                            .bind(id)
                            .run();
                        await env.WRAP_DB
                            .prepare(`DELETE FROM daily_tasks WHERE id = ?`)
                            .bind(id)
                            .run();

                        return new Response(null, { status: 204, headers: CORS_HEADERS });
                    }
                }
            }

            // ===== DAILY SUBTASKS (direct by id) =====
            if (pathname.startsWith("/api/daily-subtasks/")) {
                const subtaskId = pathname.split("/").pop();

                if (request.method === "PATCH") {
                    return await updateDailySubtask(request, env, subtaskId);
                }

                if (request.method === "DELETE") {
                    await env.WRAP_DB
                        .prepare(`DELETE FROM daily_task_subtasks WHERE id = ?`)
                        .bind(subtaskId)
                        .run();
                    return new Response(null, { status: 204, headers: CORS_HEADERS });
                }
            }

            // ===== MONTHLY GOALS =====
            if (pathname === "/api/monthly-goals" && request.method === "GET") {
                return await listMonthlyGoals(env, searchParams);
            }

            if (pathname === "/api/monthly-goals" && request.method === "POST") {
                return await createMonthlyGoal(request, env);
            }

            if (pathname.startsWith("/api/monthly-goals/")) {
                const id = pathname.split("/").pop();

                if (request.method === "PATCH") {
                    return await updateMonthlyGoal(request, env, id);
                }

                if (request.method === "DELETE") {
                    await env.WRAP_DB
                        .prepare(`DELETE FROM monthly_goals WHERE id = ?`)
                        .bind(id)
                        .run();
                    return new Response(null, { status: 204, headers: CORS_HEADERS });
                }
            }

            // ===== ANNUAL GOALS =====
            if (pathname === "/api/annual-goals" && request.method === "GET") {
                return await listAnnualGoals(env, searchParams);
            }

            if (pathname === "/api/annual-goals" && request.method === "POST") {
                return await createAnnualGoal(request, env);
            }

            if (pathname.startsWith("/api/annual-goals/")) {
                const id = pathname.split("/").pop();

                if (request.method === "PATCH") {
                    return await updateAnnualGoal(request, env, id);
                }

                if (request.method === "DELETE") {
                    await env.WRAP_DB
                        .prepare(`DELETE FROM annual_goals WHERE id = ?`)
                        .bind(id)
                        .run();
                    return new Response(null, { status: 204, headers: CORS_HEADERS });
                }
            }

            // ===== GOAL CATEGORIES =====
            if (pathname === "/api/goal-categories" && request.method === "GET") {
                return await listGoalCategories(env, searchParams);
            }

            if (pathname === "/api/goal-categories" && request.method === "POST") {
                return await createGoalCategory(request, env);
            }

            if (pathname.startsWith("/api/goal-categories/")) {
                const id = pathname.split("/").pop();

                if (request.method === "PATCH") {
                    return await updateGoalCategory(request, env, id);
                }
            }

            // ===== GOAL SUBTASKS =====
            // GET/POST /api/goals/:type/:id/subtasks
            const goalSubtasksMatch = pathname.match(/^\/api\/goals\/(monthly|annual)\/(\d+)\/subtasks$/);
            if (goalSubtasksMatch) {
                const [, goalType, goalId] = goalSubtasksMatch;

                if (request.method === "GET") {
                    return await listGoalSubtasks(env, goalType, goalId);
                }

                if (request.method === "POST") {
                    return await createGoalSubtask(request, env, goalType, goalId);
                }
            }

            // PATCH/DELETE /api/goal-subtasks/:id
            if (pathname.startsWith("/api/goal-subtasks/")) {
                const segments = pathname.split("/");
                const subtaskId = segments[3];
                const action = segments[4]; // 'add-to-calendar' or undefined

                // POST /api/goal-subtasks/:id/add-to-calendar
                if (action === "add-to-calendar" && request.method === "POST") {
                    return await addGoalSubtaskToCalendar(request, env, subtaskId);
                }

                if (request.method === "PATCH") {
                    return await updateGoalSubtask(request, env, subtaskId);
                }

                if (request.method === "DELETE") {
                    return await deleteGoalSubtask(env, subtaskId);
                }
            }

            // ===== PROJECTS =====
            if (pathname === "/api/projects" && request.method === "GET") {
                return await listProjects(env);
            }

            if (pathname === "/api/projects" && request.method === "POST") {
                return await createProject(request, env);
            }

            if (pathname.startsWith("/api/projects/")) {
                const segments = pathname.split("/");
                const projectId = segments[3];
                const resource = segments[4]; // 'steps' or undefined

                // GET /api/projects/:id (with steps)
                if (!resource && request.method === "GET") {
                    return await getProjectWithSteps(env, projectId);
                }

                if (request.method === "PATCH") {
                    return await updateProject(request, env, projectId);
                }

                if (request.method === "DELETE") {
                    return await deleteProject(env, projectId);
                }

                // POST /api/projects/:id/duplicate
                if (resource === "duplicate" && request.method === "POST") {
                    return await duplicateProject(request, env, projectId);
                }

                // POST /api/projects/:id/steps
                if (resource === "steps" && request.method === "POST") {
                    return await createProjectStep(request, env, projectId);
                }
            }

            // ===== PROJECT STEPS =====
            if (pathname.startsWith("/api/project-steps/")) {
                const stepId = pathname.split("/").pop();

                if (request.method === "PATCH") {
                    return await updateProjectStep(request, env, stepId);
                }

                if (request.method === "DELETE") {
                    return await deleteProjectStep(env, stepId);
                }
            }

            // ===== USER PREFERENCES =====
            if (pathname.startsWith("/api/user-preferences/")) {
                const userId = pathname.split("/").pop();

                if (request.method === "GET") {
                    return await getUserPreferences(env, userId);
                }

                if (request.method === "PUT") {
                    return await saveUserPreferences(request, env, userId);
                }
            }

            // ===== BOARD IDEAS & VOTING =====
            if (pathname === "/api/pillar-suggestions" && request.method === "GET") {
                return await listPillarSuggestions(env, searchParams);
            }
            if (pathname === "/api/pillar-suggestions" && request.method === "POST") {
                return await createPillarSuggestion(request, env);
            }
            if (pathname.startsWith("/api/pillar-suggestions/")) {
                const parts = pathname.split("/");
                const id = parts[3]; // /api/pillar-suggestions/123...

                if (parts[4] === "vote" && request.method === "POST") {
                    // /api/pillar-suggestions/123/vote
                    return await toggleTaskVote(request, env, id);
                }

                if (request.method === "PATCH") {
                    return await updatePillarSuggestion(request, env, id);
                }

                if (request.method === "DELETE") {
                    await env.WRAP_DB.prepare("DELETE FROM task_votes WHERE task_id = ?").bind(id).run();
                    await env.WRAP_DB.prepare("DELETE FROM pillar_suggestions WHERE id = ?").bind(id).run();
                    return json({ success: true });
                }
            }

            // ===== USER VOTE COUNT =====
            if (pathname === "/api/user-votes" && request.method === "GET") {
                const userId = searchParams.get("userId");
                if (!userId) return json({ error: "userId required" }, 400);

                const now = new Date();
                const voteMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

                const countRes = await env.WRAP_DB.prepare("SELECT COUNT(*) as count FROM task_votes WHERE user_id = ? AND vote_month = ?")
                    .bind(userId, voteMonth).first();

                const used = countRes ? countRes.count : 0;
                const remaining = Math.max(0, 5 - used);

                return json({ used, remaining, limit: 5, month: voteMonth });
            }
            // ===== LICENSE VERIFICATION =====
            if (pathname === "/api/verify-license" && request.method === "GET") {
                const license = searchParams.get("number");
                if (!license) return json({ error: "License number required" }, 400);

                // Strip everything except digits (e.g. SL3360322 -> 3360322)
                const clean = license.trim().replace(/\D/g, "");
                // Basic format check to fail fast on garbage
                if (clean.length < 4) {
                    return json({ valid: false, message: "License number too short" });
                }

                try {
                    // Step 1: GET the Search Page to establish session cookies
                    // We must request the specific search type page to get the right form context, though cookies are usually global.
                    const searchPageUrl = "https://www.myfloridalicense.com/wl11.asp?mode=1&search=LicNbr&SID=&brd=&typ=";
                    const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

                    const res1 = await fetch(searchPageUrl, {
                        headers: { "User-Agent": userAgent }
                    });

                    // Extract Cookies (Set-Cookie header)
                    // We must filter out attributes like Path, HttpOnly, etc.
                    const cookieHeader = res1.headers.get("set-cookie");
                    let cookies = "";
                    if (cookieHeader) {
                        // Take only the first part before any semicolon for each cookie if multiple,
                        // but fetch typically returns them as one string or we just need the first token.
                        // Simple approach: split by ';' and take the first item.
                        cookies = cookieHeader.split(';')[0];
                    }

                    // Step 2: POST the search
                    // Action URL found in research: mode=2
                    const postUrl = "https://www.myfloridalicense.com/wl11.asp?mode=2&search=LicNbr&SID=&brd=&typ=";

                    // Construct form data
                    const params = new URLSearchParams();
                    params.append("hSID", "");
                    params.append("hSearchType", "LicNbr");
                    params.append("hLastName", "");
                    params.append("hFirstName", "");
                    params.append("hMiddleName", "");
                    params.append("hOrgName", "");
                    params.append("hSearchOpt", "");
                    params.append("hSearchOpt2", "");
                    params.append("hSearchAltName", "");
                    params.append("hSearchPartName", "");
                    params.append("hSearchFuzzy", "");
                    params.append("hDivision", "ALL");
                    params.append("hBoard", "");
                    params.append("hLicenseType", "");
                    params.append("hSpecQual", "");
                    params.append("hAddrType", "");
                    params.append("hCity", "");
                    params.append("hCounty", "");
                    params.append("hState", "");
                    params.append("hLicNbr", "");
                    params.append("hAction", "");
                    params.append("hCurrPage", "");
                    params.append("hTotalPages", "");
                    params.append("hTotalRecords", "");
                    params.append("hPageAction", "");
                    params.append("hDDChange", "");
                    params.append("hBoardType", "");
                    params.append("hLicTyp", "");
                    params.append("hSearchHistoric", "");
                    params.append("hRecsPerPage", "");
                    params.append("LicNbr", clean); // The actual input
                    params.append("Board", "");
                    params.append("LicenseType", "");
                    params.append("SpecQual", "");
                    params.append("RecsPerPage", "50");
                    params.append("Search1", "Search");

                    const res2 = await fetch(postUrl, {
                        method: "POST",
                        headers: {
                            "User-Agent": userAgent,
                            "Content-Type": "application/x-www-form-urlencoded",
                            "Referer": searchPageUrl,
                            "Cookie": cookies // Pass the clean cookie
                        },
                        body: params.toString()
                    });

                    if (!res2.ok) throw new Error(`DBPR POST returned ${res2.status}`);

                    const html = await res2.text();

                    // Check for "No records found" (Standard DBPR message)
                    if (html.includes("No records found") || html.includes("Invalid License Number")) {
                        return json({ valid: false, message: "No records found on DBPR." });
                    }

                    // Robust Parsing using Index positioning
                    // 1. Find the LicenseDetail link which indicates a result row
                    const linkIndex = html.indexOf("LicenseDetail.asp");
                    if (linkIndex === -1) {
                        return json({ valid: false, message: "License found but could not verify result row structure." });
                    }

                    // 2. Find the start of the row (<tr) preceding the link
                    // We scan backwards or use regex matchAll to find the closest TR
                    const trMatches = [...html.matchAll(/<tr/gi)];
                    let rowStart = -1;
                    for (const m of trMatches) {
                        if (m.index < linkIndex) {
                            rowStart = m.index;
                        } else {
                            break;
                        }
                    }

                    if (rowStart === -1) {
                        return json({ valid: false, message: "Could not locate start of result row." });
                    }

                    // 3. Extract a generous chunk starting from the row
                    // We don't rely on </tr> because DBPR HTML might be malformed (missing </tr>)
                    const contentChunk = html.substring(rowStart, rowStart + 2000);

                    const colRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
                    const cols = [...contentChunk.matchAll(colRegex)].map(m => m[1]);

                    const cleanText = (str) => {
                        if (!str) return "";
                        let txt = str.replace(/<br\s*\/?>/gi, " | ")
                            .replace(/<[^>]+>/g, "") // Strip tags
                            .replace(/&nbsp;/g, " ")
                            .replace(/\s+/g, " ")
                            .trim();
                        return txt;
                    };

                    if (cols.length >= 5) {
                        return json({
                            valid: true,
                            license: clean,
                            provider: "DBPR (Live Scraped)",
                            details: {
                                name: cleanText(cols[1]),
                                type: cleanText(cols[0]),
                                status_expires: cleanText(cols[4]),
                                number_rank: cleanText(cols[3])
                            }
                        });
                    }

                    return json({ valid: false, message: "Could not parse columns from DBPR result." });

                } catch (e) {
                    console.error("DBPR Scrape Error:", e);
                    return json({ valid: false, error: e.message }, 500);
                }
            }

            // ===== OFFICE MLS CONTACTS =====
            if (pathname === "/api/offices" && request.method === "GET") {
                return await listOfficeMlsContacts(env, searchParams);
            }

            if (pathname === "/api/offices/sync" && request.method === "POST") {
                return await syncOfficeMlsContacts(request, env);
            }

            if (pathname.startsWith("/api/offices/")) {
                const id = pathname.split("/").pop();

                if (request.method === "GET") {
                    const { results } = await env.WRAP_DB
                        .prepare(`SELECT * FROM office_mls_contacts WHERE id = ? OR contact_id = ?`)
                        .bind(id, id)
                        .all();
                    if (!results.length) return json({ error: "Office not found" }, 404);
                    return json(results[0]);
                }

                if (request.method === "DELETE") {
                    await env.WRAP_DB
                        .prepare(`DELETE FROM office_mls_contacts WHERE id = ? OR contact_id = ?`)
                        .bind(id, id)
                        .run();
                    return json({ success: true });
                }
            }

            // Manual trigger for Office MLS sync (same as cron job)
            if (pathname === "/api/offices/run-sync" && request.method === "POST") {
                try {
                    const result = await syncOfficeMlsFromGrowthZone(env);
                    return json({ success: true, ...result });
                } catch (err) {
                    return json({ error: err.message }, 500);
                }
            }

            return json({ error: "Not found" }, 404);
        } catch (err) {
            console.error("Wrapsheet worker error (wrapsheet-v4):", err);
            return json({ error: err.message || "Server error" }, 500);
        }
    },

    // Daily cron job for Office MLS sync
    async scheduled(event, env, ctx) {
        console.log("Cron trigger fired:", event.cron);
        try {
            await syncOfficeMlsFromGrowthZone(env);
            console.log("Office MLS sync completed successfully");
        } catch (err) {
            console.error("Office MLS sync failed:", err);
        }
    },
};

/* ---------- BOARD IDEAS & VOTING LOGIC ---------- */

async function listPillarSuggestions(env, params) {
    const assignedTo = params.get("assignedTo");
    const top = params.get("top"); // if present, sort by votes desc limit X
    const status = params.get("status") || "active"; // or 'suggested', or 'all'
    const userId = params.get("userId"); // to check liked_by_me
    const source = params.get("source"); // 'staff' = staff-created, 'suggestion' = user suggestions, null = all

    let query = `
      SELECT ps.*, 
             u.name as created_by_name,
             (SELECT COUNT(*) FROM task_votes tv WHERE tv.task_id = ps.id) as vote_count
      FROM pillar_suggestions ps
      LEFT JOIN users u ON ps.created_by_id = u.id
      WHERE 1=1
    `;
    const args = [];

    if (assignedTo) {
        query += ` AND ps.assigned_to_id = ?`;
        args.push(assignedTo);
    }

    // Filter by source (staff vs user suggestions)
    if (source === 'staff') {
        // Include items with source='staff' OR source=NULL (old items before field was added)
        // The assignedTo filter will further limit to specific staff member
        query += ` AND (ps.source = 'staff' OR ps.source IS NULL)`;
    } else if (source === 'suggestion') {
        // User suggestions: explicit 'suggestion' source OR NULL source items that weren't created by staff
        // Exclude items explicitly marked as staff-created
        query += ` AND (ps.source = 'suggestion' OR ps.source IS NULL)`;
    }
    // If source is not specified, return all

    if (status !== 'all') {
        if (status === 'active_or_completed') {
            query += ` AND (ps.status = 'active' OR ps.status = 'completed')`;
        } else {
            query += ` AND ps.status = ?`;
            args.push(status);
        }
    }

    // Default sort by created_at DESC unless 'top'
    if (top) {
        query += ` ORDER BY vote_count DESC, ps.created_at DESC LIMIT ?`;
        args.push(Number(top));
    } else {
        query += ` ORDER BY ps.created_at DESC`;
        if (params.get("limit")) {
            query += ` LIMIT ?`;
            args.push(Number(params.get("limit")));
        }
    }


    const { results } = await env.WRAP_DB.prepare(query).bind(...args).all();

    // If userId provided, check if liked
    if (userId) {
        // Fetch user votes for these tasks
        // Optimal: fetch all votes for user in this set? Or just 1 query per task?
        // Let's do a bulk query: select task_id from task_votes where user_id = ? and task_id IN (...)
        if (results.length > 0) {
            const taskIds = results.map(r => r.id).join(",");
            const likedRes = await env.WRAP_DB.prepare(`SELECT task_id FROM task_votes WHERE user_id = ? AND task_id IN (${taskIds})`).bind(userId).all();
            const likedSet = new Set(likedRes.results.map(r => r.task_id));

            results.forEach(r => {
                r.liked_by_me = likedSet.has(r.id);
            });
        }
    }

    return json(results);
}


async function createPillarSuggestion(request, env) {
    const body = await getBody(request);
    // body: { title, description, pillar, category, created_by_id, assigned_to_id }

    // Use frontend-provided assigned_to_id if present, else derive from category
    let assigned_to_id = body.assigned_to_id || null;

    // If not explicitly provided, fall back to category mapping
    if (!assigned_to_id && body.category) {
        const STAFF_MAP = {
            "Technology": 2, "Website": 2, "Marketing": 2,
            "MLS": 3,
            "Education": 5, "Events": 5,
            "Membership": 4,
            "Compliance": 1, "Professional Standards": 1, "Community Outreach": 1
        };
        assigned_to_id = STAFF_MAP[body.category] || null;
    }
    const now = new Date().toISOString();
    const source = body.source || null; // 'staff' for WrapSheet, null for BoardIdeas
    const status = body.status || 'suggested'; // staff pillars use 'active', suggestions use 'suggested'

    const res = await env.WRAP_DB.prepare(`
      INSERT INTO pillar_suggestions 
      (title, description, pillar, category, assigned_to_id, created_by_id, status, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
        body.title,
        body.description || "",
        body.pillar,
        body.category,
        assigned_to_id,
        body.created_by_id,
        status,
        source,
        now
    ).first();

    return json({ id: res.id, success: true });
}

async function updatePillarSuggestion(request, env, id) {
    const body = await getBody(request);
    // can update status, progress_notes, title, description, pillar, assigned_to_id, progress_percent, eta_date

    let query = "UPDATE pillar_suggestions SET ";
    const args = [];
    const sets = [];

    if (body.title !== undefined) {
        sets.push("title = ?");
        args.push(body.title);
    }
    if (body.description !== undefined) {
        sets.push("description = ?");
        args.push(body.description);
    }
    if (body.pillar !== undefined) {
        sets.push("pillar = ?");
        args.push(body.pillar);
    }
    if (body.assigned_to_id !== undefined) {
        sets.push("assigned_to_id = ?");
        args.push(body.assigned_to_id);
    }
    if (body.progress_percent !== undefined) {
        sets.push("progress_percent = ?");
        args.push(body.progress_percent);
    }
    if (body.eta_date !== undefined) {
        sets.push("eta_date = ?");
        args.push(body.eta_date);
    }
    if (body.status !== undefined) {
        sets.push("status = ?");
        args.push(body.status);
    }
    if (body.progress_notes !== undefined) {
        sets.push("progress_notes = ?");
        args.push(body.progress_notes);
    }
    if (body.status === 'completed') {
        sets.push("completed_at = ?");
        args.push(new Date().toISOString());
    }

    // Auto-mark as completed if progress hits 100%
    if (body.progress_percent !== undefined && body.progress_percent >= 100 && body.status !== 'completed') {
        sets.push("status = ?");
        args.push('completed');
        sets.push("completed_at = ?");
        args.push(new Date().toISOString());
    }

    if (sets.length === 0) return json({ success: true }); // no op

    query += sets.join(", ") + " WHERE id = ?";
    args.push(id);

    await env.WRAP_DB.prepare(query).bind(...args).run();

    // Refund votes (delete all votes for this task) when completed
    const isCompleted = body.status === 'completed' || (body.progress_percent !== undefined && body.progress_percent >= 100);
    if (isCompleted) {
        await env.WRAP_DB.prepare("DELETE FROM task_votes WHERE task_id = ?").bind(id).run();
    }

    return json({ success: true });
}

async function toggleTaskVote(request, env, taskId) {
    const body = await getBody(request); // { userId: 123 }
    const userId = body.userId;
    if (!userId) return json({ error: "userId required" }, 400);

    const now = new Date();
    const voteMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Check if already voted
    const existing = await env.WRAP_DB.prepare("SELECT id FROM task_votes WHERE task_id = ? AND user_id = ?")
        .bind(taskId, userId).first();

    if (existing) {
        // Remove vote (unlike)
        await env.WRAP_DB.prepare("DELETE FROM task_votes WHERE id = ?").bind(existing.id).run();
        return json({ voted: false, message: "Vote removed" });
    } else {
        // Check limit (5 per month)
        const countRes = await env.WRAP_DB.prepare("SELECT COUNT(*) as c FROM task_votes WHERE user_id = ? AND vote_month = ?")
            .bind(userId, voteMonth).first();

        if (countRes.c >= 5) {
            return json({ error: "Monthly vote limit reached (5/5)", limitReached: true }, 403);
        }

        // Add vote
        await env.WRAP_DB.prepare("INSERT INTO task_votes (task_id, user_id, vote_month, created_at) VALUES (?, ?, ?, ?)")
            .bind(taskId, userId, voteMonth, now.toISOString()).run();

        return json({ voted: true, message: "Vote added" });
    }
}

async function createUser(request, env) {
    try {
        const body = await getBody(request);
        // Expect: { name, email }
        if (!body.name || !body.email) {
            return json({ error: "Name and email required" }, 400);
        }

        const role = body.role || 'member';

        // Check if exists
        const existing = await env.WRAP_DB.prepare("SELECT * FROM users WHERE email = ?").bind(body.email).first();
        if (existing) {
            return json({ error: "User already exists", user: existing }, 409); // Conflict
        }

        const now = new Date().toISOString();
        // Insert
        const res = await env.WRAP_DB.prepare(`
          INSERT INTO users (name, email, role, avatar_url, created_at)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id, name, email, role
        `).bind(
            body.name,
            body.email,
            role,
            // Default avatar based on initials or generic
            `https://ui-avatars.com/api/?name=${encodeURIComponent(body.name)}&background=random`,
            now
        ).first();

        return json(res);
    } catch (e) {
        console.error("Create user error", e);
        return json({ error: "Failed to create user" }, 500);
    }
}

/* ---------- OFFICE MLS CONTACTS ---------- */

async function listOfficeMlsContacts(env, params) {
    let query = `SELECT * FROM office_mls_contacts WHERE 1=1`;
    const args = [];

    const status = params.get("status");
    if (status) {
        query += ` AND member_status = ?`;
        args.push(status);
    }

    const search = params.get("search");
    if (search) {
        query += ` AND (name LIKE ? OR nrds_id LIKE ? OR mls_id LIKE ?)`;
        const term = `%${search}%`;
        args.push(term, term, term);
    }

    query += ` ORDER BY name`;

    const { results } = await env.WRAP_DB.prepare(query).bind(...args).all();
    return json(results);
}

async function syncOfficeMlsContacts(request, env) {
    const body = await getBody(request);

    if (!body.contacts || !Array.isArray(body.contacts)) {
        return json({ error: "contacts array required" }, 400);
    }

    const now = new Date().toISOString();
    let inserted = 0;
    let updated = 0;

    for (const c of body.contacts) {
        if (!c.contact_id || !c.name) continue;

        // Check if exists
        const { results } = await env.WRAP_DB
            .prepare(`SELECT id FROM office_mls_contacts WHERE contact_id = ?`)
            .bind(c.contact_id)
            .all();

        if (results.length) {
            // Update
            await env.WRAP_DB.prepare(`
                UPDATE office_mls_contacts SET
                    name = ?,
                    nrds_id = ?,
                    mls_id = ?,
                    mls_office_id = ?,
                    address_line1 = ?,
                    address_city = ?,
                    address_state = ?,
                    address_zip = ?,
                    primary_email = ?,
                    primary_phone = ?,
                    member_status = ?,
                    membership_start_date = ?,
                    membership_expiration_date = ?,
                    last_synced_at = ?,
                    updated_at = ?
                WHERE contact_id = ?
            `).bind(
                c.name,
                c.nrds_id || null,
                c.mls_id || null,
                c.mls_office_id || null,
                c.address_line1 || null,
                c.address_city || null,
                c.address_state || null,
                c.address_zip || null,
                c.primary_email || null,
                c.primary_phone || null,
                c.member_status || null,
                c.membership_start_date || null,
                c.membership_expiration_date || null,
                now,
                now,
                c.contact_id
            ).run();
            updated++;
        } else {
            // Insert
            await env.WRAP_DB.prepare(`
                INSERT INTO office_mls_contacts (
                    contact_id, name, nrds_id, mls_id, mls_office_id,
                    address_line1, address_city, address_state, address_zip,
                    primary_email, primary_phone, member_status,
                    membership_start_date, membership_expiration_date,
                    last_synced_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                c.contact_id,
                c.name,
                c.nrds_id || null,
                c.mls_id || null,
                c.mls_office_id || null,
                c.address_line1 || null,
                c.address_city || null,
                c.address_state || null,
                c.address_zip || null,
                c.primary_email || null,
                c.primary_phone || null,
                c.member_status || null,
                c.membership_start_date || null,
                c.membership_expiration_date || null,
                now,
                now,
                now
            ).run();
            inserted++;
        }
    }

    return json({ success: true, inserted, updated, total: body.contacts.length });
}

/* ---------- AUTOMATED GROWTHZONE SYNC (CRON) ---------- */

const GZ_PROXY_BASE = "https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev";

async function syncOfficeMlsFromGrowthZone(env) {
    console.log("Starting GrowthZone Office MLS sync...");

    // Fetch last 30 days of changes
    const ms30Days = 30 * 24 * 60 * 60 * 1000;
    const dt = new Date(Date.now() - ms30Days);
    const since = dt.toISOString().replace(/\.\d{3}Z$/, "Z");

    // Use Service Binding for worker-to-worker communication
    const path = `/changes?since=${since}`;
    console.log("Calling GrowthZone proxy via Service Binding:", path);

    // Use the Service Binding (env.GZ_PROXY) instead of external fetch
    const res = await env.GZ_PROXY.fetch(`https://gz-realestate-proxy.bonitaspringsrealtors.workers.dev${path}`, {
        method: "GET",
        headers: {
            "Accept": "application/json"
        }
    });
    console.log("GrowthZone proxy response status:", res.status);

    if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.log("GrowthZone proxy error body:", body);
        throw new Error(`GrowthZone API failed: ${res.status}`);
    }

    const data = await res.json();
    let contacts = data;
    // GrowthZone returns data in "Changes" array
    if (Array.isArray(data.Changes)) contacts = data.Changes;
    if (Array.isArray(data.Results)) contacts = data.Results;
    if (Array.isArray(data.results)) contacts = data.results;

    if (!Array.isArray(contacts)) {
        console.log("Response keys:", Object.keys(data));
        throw new Error("Unexpected response format from GrowthZone");
    }

    console.log(`Fetched ${contacts.length} contacts from GrowthZone`);

    // Filter for Office MLS (Active OR Dropped)
    const filtered = contacts.filter(contact => {
        if (!contact.Memberships || !Array.isArray(contact.Memberships)) return false;
        return contact.Memberships.some(m =>
            m.MembershipType === "Office MLS" &&
            (m.MembershipStatus === "Active" || m.MembershipStatus === "Dropped")
        );
    });

    console.log(`Filtered to ${filtered.length} Office MLS contacts (Active + Dropped)`);

    const now = new Date().toISOString();
    let inserted = 0, updated = 0, addressCount = 0, phoneCount = 0;

    for (const c of filtered) {
        const membership = c.Memberships.find(m =>
            m.MembershipType === "Office MLS" &&
            (m.MembershipStatus === "Active" || m.MembershipStatus === "Dropped")
        );

        // Get primary address
        const primaryAddr = c.Addresses?.find(a => a.IsPrimary) || c.Addresses?.[0];

        // Check if contact exists
        const { results } = await env.WRAP_DB
            .prepare(`SELECT id FROM office_mls_contacts WHERE contact_id = ?`)
            .bind(c.ContactId)
            .all();

        if (results.length) {
            // Update contact
            await env.WRAP_DB.prepare(`
                UPDATE office_mls_contacts SET
                    name = ?, nrds_id = ?, mls_id = ?, mls_office_id = ?,
                    address_line1 = ?, address_city = ?, address_state = ?, address_zip = ?,
                    primary_email = ?, primary_phone = ?, member_status = ?,
                    membership_start_date = ?, membership_expiration_date = ?,
                    last_synced_at = ?, updated_at = ?
                WHERE contact_id = ?
            `).bind(
                c.Name,
                c.RealEstateEditionFields?.NRDSMemberId || c.AccountNumber || null,
                c.RealEstateEditionFields?.MLSId || null,
                c.RealEstateEditionFields?.MLSOfficeId || null,
                primaryAddr?.Line1 || null,
                primaryAddr?.City || null,
                primaryAddr?.State || null,
                primaryAddr?.ZIP || null,
                c.Emails?.find(e => e.IsPrimary)?.Email || c.Emails?.[0]?.Email || null,
                c.Phones?.find(p => p.IsPrimary)?.Number || c.Phones?.[0]?.Number || null,
                membership?.MembershipStatus || c.Status,
                membership?.StartDate || null,
                membership?.ExpirationDate || null,
                now,
                now,
                c.ContactId
            ).run();
            updated++;
        } else {
            // Insert contact
            await env.WRAP_DB.prepare(`
                INSERT INTO office_mls_contacts (
                    contact_id, name, nrds_id, mls_id, mls_office_id,
                    address_line1, address_city, address_state, address_zip,
                    primary_email, primary_phone, member_status,
                    membership_start_date, membership_expiration_date,
                    last_synced_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                c.ContactId,
                c.Name,
                c.RealEstateEditionFields?.NRDSMemberId || c.AccountNumber || null,
                c.RealEstateEditionFields?.MLSId || null,
                c.RealEstateEditionFields?.MLSOfficeId || null,
                primaryAddr?.Line1 || null,
                primaryAddr?.City || null,
                primaryAddr?.State || null,
                primaryAddr?.ZIP || null,
                c.Emails?.find(e => e.IsPrimary)?.Email || c.Emails?.[0]?.Email || null,
                c.Phones?.find(p => p.IsPrimary)?.Number || c.Phones?.[0]?.Number || null,
                membership?.MembershipStatus || c.Status,
                membership?.StartDate || null,
                membership?.ExpirationDate || null,
                now, now, now
            ).run();
            inserted++;
        }

        // Sync addresses - delete old and insert new
        await env.WRAP_DB.prepare(`DELETE FROM office_mls_addresses WHERE office_contact_id = ?`)
            .bind(c.ContactId).run();

        for (const addr of (c.Addresses || [])) {
            await env.WRAP_DB.prepare(`
                INSERT INTO office_mls_addresses (
                    office_contact_id, address_id, address_type, line1, line2,
                    city, state, zip, is_primary, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                c.ContactId,
                addr.AddressId || null,
                addr.AddressType || null,
                addr.Line1 || null,
                addr.Line2 || null,
                addr.City || null,
                addr.State || null,
                addr.ZIP || null,
                addr.IsPrimary ? 1 : 0,
                now, now
            ).run();
            addressCount++;
        }

        // Sync phones - delete old and insert new
        await env.WRAP_DB.prepare(`DELETE FROM office_mls_phones WHERE office_contact_id = ?`)
            .bind(c.ContactId).run();

        for (const phone of (c.Phones || [])) {
            await env.WRAP_DB.prepare(`
                INSERT INTO office_mls_phones (
                    office_contact_id, phone_id, phone_type, number, is_primary,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                c.ContactId,
                phone.PhoneId || null,
                phone.PhoneType || null,
                phone.Number || null,
                phone.IsPrimary ? 1 : 0,
                now, now
            ).run();
            phoneCount++;
        }
    }

    console.log(`Sync complete: ${inserted} inserted, ${updated} updated, ${addressCount} addresses, ${phoneCount} phones`);
    return { inserted, updated, addressCount, phoneCount };
}

