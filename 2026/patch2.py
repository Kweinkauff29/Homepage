import re

with open('Homepage2025.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update JS
old_js_pattern = re.compile(r'function setupCarousel\(\) \{.*?(track\.addEventListener\(\'mouseenter\')', re.DOTALL)
new_js = """let isAnimating = false;
    function setupCarousel() {
      const track = document.getElementById('shuffling-track');
      const prevBtn = document.getElementById('shuffling-prev');
      const nextBtn = document.getElementById('shuffling-next');

      if (!track || !track.children[0]) return;

      function move(dir) {
        if (isAnimating) return;
        isAnimating = true;

        let containerWidth = track.parentElement.offsetWidth;
        let moveDist = 0;
        let count = 0;

        if (dir === 'next') {
          for (let i = 0; i < track.children.length; i++) {
            let w = track.children[i].offsetWidth + 20;
            if (moveDist + w > containerWidth && count > 0) break;
            moveDist += w;
            count++;
          }
          track.style.transition = 'transform 0.8s ease-in-out';
          track.style.transform = `translateX(-${moveDist}px)`;

          setTimeout(() => {
            for (let i = 0; i < count; i++) {
              track.appendChild(track.children[0]);
            }
            track.style.transition = 'none';
            track.style.transform = 'translateX(0)';
            setTimeout(() => { isAnimating = false; }, 50);
          }, 800);
        } else {
          for (let i = track.children.length - 1; i >= 0; i--) {
            let w = track.children[i].offsetWidth + 20;
            if (moveDist + w > containerWidth && count > 0) break;
            moveDist += w;
            count++;
          }
          for (let i = 0; i < count; i++) {
            track.insertBefore(track.lastElementChild, track.children[0]);
          }
          track.style.transition = 'none';
          track.style.transform = `translateX(-${moveDist}px)`;
          
          void track.offsetWidth;

          track.style.transition = 'transform 0.8s ease-in-out';
          track.style.transform = 'translateX(0)';
          
          setTimeout(() => { isAnimating = false; }, 800);
        }
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          move('next');
          stopAutoPlay();
          startAutoPlay();
        });
      }
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          move('prev');
          stopAutoPlay();
          startAutoPlay();
        });
      }

      \\1"""

# The \\1 restores track.addEventListener('mouseenter'...
html = old_js_pattern.sub(new_js, html)

# 2. Update CSS for title overlap
html = html.replace('top: 50px;\n        left: 60px;', 'top: 4vh;\n        left: 60px;')
html = html.replace('top: 30px;\n          left: 30px;', 'top: 2vh;\n          left: 30px;')
html = html.replace('top: 30px;\n          right: 30px;', 'top: 2vh;\n          right: 30px;')

# 3. Modify autoPlayInterval function to remove itemWidth declaration
# We replaced setupCarousel, but startAutoPlay is right after it. Wait, startAutoPlay just calls move('next').
# Let's fix startAutoPlay to not set itemWidth
html = html.replace('itemWidth = track.children[0].offsetWidth + 20;\n              move(\'next\');', 'move(\'next\');')


with open('Homepage2025.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Paging logic injected!")
