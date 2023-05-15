# Figma CSS Variables Plugin

## Description
This Figma plugin allows you to convert CSS variables into Figma styles. The plugin reads CSS text and processes it to extract color variables and categories. It then applies these values to create new Figma styles.

## Author

- Name: Ken Pan
- Email: [jpan28@id.iit.edu](mailto:jpan28@id.iit.edu)

## Features
- Convert CSS color variables into Figma paint styles
- Convert CSS categories into Figma text styles
- Support for CSS variables defined in `:root` block
- Support for CSS comments
- Error handling and UI feedback

## Usage
1. Install the plugin in Figma.
2. Open the plugin, a UI window will appear.
3. Input your CSS text into the provided field.
4. Click the "Check CSS Variables" button.
5. The plugin will process the CSS text and create Figma styles based on the CSS variables and categories found.

## Important Notes
- CSS comments (`//`) and empty lines are skipped during processing.
- Each CSS category should be defined within a pair of braces `{}`.
- CSS variables should start with `--`.
- The plugin assumes 'Regular' style for font families.
- Not all font weights are supported in Figma, so some mapping might be needed.
- For colors, the plugin supports HEX, RGB, RGBA, HSL, and HSLA formats.

## Contributing
Contributions to improve this plugin are welcome. Please feel free to submit a pull request or create an issue.
