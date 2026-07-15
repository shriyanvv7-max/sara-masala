from pathlib import Path
import colorsys

from PIL import Image


source = Image.open("tmp/imagegen/grandmother-base.png").convert("RGBA")
tones = {
    "green": (0.35, 0.72, 0.48),
    "red": (0.0, 0.78, 0.66),
    "yellow": (0.12, 0.78, 0.82),
    "orange": (0.06, 0.82, 0.78),
    "brown": (0.07, 0.55, 0.55),
}
output = Path("public/images/illustrations")
output.mkdir(parents=True, exist_ok=True)

for name, (target_hue, target_saturation, target_value) in tones.items():
    image = source.copy()
    pixels = image.load()

    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = pixels[x, y]
            hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)

            # The sari/blouse accents are the saturated red-to-orange portions.
            # Gold jewellery and neutral sari/stone tones remain outside this range.
            if alpha and saturation > 0.42 and (hue < 0.075 or hue > 0.975) and red > green * 1.22 and red > blue * 1.35:
                recolored = colorsys.hsv_to_rgb(
                    target_hue,
                    max(0.38, min(0.92, target_saturation * saturation / 0.78)),
                    max(0.18, min(1, target_value * value / 0.62)),
                )
                pixels[x, y] = (*[round(channel * 255) for channel in recolored], alpha)

    path = output / f"grandmother-{name}.webp"
    image.save(path, "WEBP", quality=82, method=6)
    print(name, path.stat().st_size)
