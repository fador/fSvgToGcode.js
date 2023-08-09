# fSVGtoGcode.js
 **Fador's direct SVG to G-code converter**

fSVGtoGcode.js is a JavaScript library that enables you to convert SVG (Scalable Vector Graphics) files into G-code, a language used to control CNC (Computer Numerical Control) machines. This library is designed to streamline the process of converting SVG drawings or designs into G-code instructions, allowing you to easily translate your vector graphics into machine-readable commands.

**NOTE** This library only traces the outlines, the shapes are not filled at the moment. SVG element transforms are not calculated either.

## Features

- Convert SVG files into G-code for CNC machines.
- Lightweight and efficient, making it suitable for both small and complex SVG files.
- Support for a wide range of common SVG elements such as polyline, polygon, circle, ellipse, line, rect
  - Path element support:
    - **M/m** move position: full
    - **Z/z** close path: full
    - **L/l, H/h, V/v** line/horisontal/vertical: full
    - **C/c** Cubic Bezier curve: Estimated with line segments
    - **S/s** Smooth Cubic Bezier Curve: Estimated with line segments
    - **Q/c** Quadratic Bezier curve: Estimated with line segments
    - **T/t** Smooth Quadratic Bezier curve: Not done
    - **A/a** Arc: Work in progress 
- Included HTML interface supports loading SVG files and visualizing the output G-code


## Installation

You can include the library directly in your HTML:

```html
<script src="path/to/fSVGtoGcode.js"></script>
```

Sample interface is included as [index.html](index.html)

## Usage

1. Import the library into your project:

```html
<script src="fSVGtoGcode.js"></script>
```

2. Load your SVG file:

```javascript
const svgData = `
<svg width="100" height="100">
  <!-- SVG elements go here -->
</svg>
`;
```

3. Convert the SVG to G-code:

```javascript
const gcode = fSVGtoGcode(svgData);
```

4. Utilize the generated G-code as needed for your CNC machine.

## Example

Here's a simple example demonstrating the conversion process:

```javascript
const svgData = `
<svg width="100" height="100">
  <rect x="10" y="10" width="80" height="80" fill="blue" />
</svg>
`;

const gcode = fSVGtoGcode(svgData);

console.log(gcode);
```

## Configuration

You can customize the G-code output by providing additional configuration options:

```javascript
const config = {
  // Custom configuration options go here
  DEBUG: false,
  scale_x: 1.0,
  scale_y: 1.0,
  tool_down_gcode: "; Tool down\nM3",
  tool_up_gcode: "; Tool up\nM5",
  init_gcode: "G21\nG90\nG0 F1000\nG0 Z0\nG0 X0 Y0\n",
};

const gcode = fSVGtoGcode(svgData, config);
```


## Compatibility

fSVGtoGcode.js supports a wide range of common SVG elements, making it suitable for various design types. However, due to the complexity and diversity of SVG features, some advanced or less common elements might not be fully supported. It's recommended to test your SVG files with this library to ensure compatibility.

## Contributions

Contributions to fSVGtoGcode.js are welcome! If you encounter any issues or would like to contribute enhancements, please open an issue or submit a pull request on the GitHub repository.

## License

This project is licensed under the [MIT License](LICENSE).

---

Give life to your CNC projects by effortlessly converting SVG files into G-code with fSVGtoGcode.js. Simplify your workflow and bring your vector designs to reality on CNC machines.