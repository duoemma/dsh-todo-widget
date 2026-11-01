# 插件图标：深色圆角方块 + 粗勾选（44px 下也要认得出来）
from PIL import Image, ImageDraw

S = 512
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

# 背景：深色圆角方块
d.rounded_rectangle([0, 0, S - 1, S - 1], radius=118, fill=(26, 28, 34, 255))
# 极轻内描边，浅色背景下边缘不至于发虚
d.rounded_rectangle([6, 6, S - 7, S - 7], radius=112, outline=(255, 255, 255, 24), width=3)

WHITE = (255, 255, 255, 255)
W = 46  # 笔画宽度

# 一条粗勾：左下短、右上长
pts = [(150, 268), (232, 350), (372, 178)]

# 先画两段线，再用圆点补圆头/圆角
d.line([pts[0], pts[1]], fill=WHITE, width=W)
d.line([pts[1], pts[2]], fill=WHITE, width=W)
d.ellipse([pts[1][0] - W // 2, pts[1][1] - W // 2, pts[1][0] + W // 2, pts[1][1] + W // 2], fill=WHITE)
for p in (pts[0], pts[2]):
    d.ellipse([p[0] - W // 2, p[1] - W // 2, p[0] + W // 2, p[1] + W // 2], fill=WHITE)

out = r"E:\文档\deepseek-harness\default-workspace\dsh-todo-widget"
img.save(out + r"\icon.png", "PNG")
img.resize((128, 128), Image.LANCZOS).save(out + r"\icon-128.png", "PNG")
print("icon.png", img.size)
