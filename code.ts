// This plugin convert CSS variables into figma styles

// This shows the HTML page in "ui.html".
figma.showUI(__html__)
figma.ui.resize(500, 400)
// make the html body background color 181818

figma.ui.onmessage = async (msg) => {
  // If the message type is 'check-css-variables'
  if (msg.type === 'check-css-text') {
    let text = msg.text
    // process the text in textarea, and return the categories and variables
    const { categories, variables } = processText(text)
    // process the color variables
    processColorVariables(variables)
    // process the text styles
    await processCategories(categories)
  }
  // close the plugin
  figma.closePlugin()
}

function processText(text: string) {
  let categories = []
  let variables = []
  let currentCategory = ''
  let isInCategory = false
  let isRootBlock = false

  const lines = text.split('\n')

  for (let line of lines) {
    line = line.trim() // remove leading/trailing whitespaces

    if (line.length === 0) continue // skip empty lines

    if (line.startsWith('//')) continue // skip comments

    // Check if we're inside a category or not
    if (isInCategory) {
      currentCategory += line
      // If the line contains a closing brace, end the category
      if (line.includes('}')) {
        categories.push(currentCategory)
        currentCategory = ''
        isInCategory = false
      }
    } else if (isRootBlock) {
      currentCategory += line
      // If the line contains a closing brace, end the root block
      if (line.includes('}')) {
        const rootVariables = currentCategory.match(/--[\w-]+:\s*.+?;/g)
        if (rootVariables) {
          variables.push(
            ...rootVariables.map((variable) => variable.replace(/;$/, '')),
          )
        }
        currentCategory = ''
        isRootBlock = false
      }
    } else {
      // Check if the line is the start of a category
      if (line.startsWith('.') || line.startsWith('#')) {
        isInCategory = true
        currentCategory += line
        continue
      }

      // Check if the line is the start of :root block
      if (line.startsWith(':root')) {
        isRootBlock = true
        currentCategory += line
        continue
      }

      // Check if the line is a variable
      const variableMatch = line.match(/^--[\w-]+:\s*.+?;$/)
      if (variableMatch) {
        // Remove the trailing semicolon
        line = line.replace(/;$/, '')
        variables.push(line)
        continue
      }
    }
  }

  // Return the categories and variables
  return { categories, variables }
}

function processColorVariables(variables: any) {
  try {
    variables.forEach((variable: string) => {
      const parts = variable.split(':')
      if (parts.length === 2) {
        let name = parts[0].trim()
        const value = parts[1].trim()
        // Modify the style name
        name = name
          .replace(/^--/, '')
          .replace(/-/g, ' ')
          .replace(/([0-9]+|a[0-9]+)/i, '/$1') // Add a slash before numbers or a+numbers
          .replace(/\b\w/g, (c) => c.toUpperCase())
        // log the name and value

        // Create a new color style in Figma
        const paintStyle = figma.createPaintStyle()
        paintStyle.name = name

        paintStyle.paints = [
          {
            ...convertToColor(value),
          },
        ]

        // Add the color style to Figma's local styles
        figma.getLocalPaintStyles().push(paintStyle)
      }
    })

    // Display a success message in the UI
    figma.ui.postMessage({
      type: 'success',
      message: 'CSS variables extracted successfully.',
    })
  } catch (error) {
    // Display an error message in the UI
    figma.ui.postMessage({
      type: 'error',
      message: 'Failed to extract CSS variables.',
    })
    console.error(error)
  }
}

async function processCategories(categories: string[]) {
  for (const category of categories) {
    const formattedTextStyles: Partial<TextStyle> = processTextStyles(category)
    const fontFamily = await loadFonts(formattedTextStyles)
    addFigmaTextStyles(formattedTextStyles, fontFamily)
  }
}

function processTextStyles(css: string) {
  // Match the category name and properties
  const match = css.match(/^(.[^{]+)\s*{([^}]*)}$/)
  const TextStyle = '' as string
  if (!match) throw new Error('Invalid category format.')

  let categoryName = match[1].trim()

  // Transform the category name
  categoryName = categoryName
    .replace(/^\./, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/ (\d+)$/, ' / $1') // add a slash before the last group of digits
  const properties = match[2].split(';').map((prop) => prop.trim())

  // Create a new text style
  const textStyle: Partial<TextStyle> = {
    type: 'TEXT',
    name: categoryName,
  }

  properties.forEach((prop) => {
    const [key, value] = prop.split(':').map((str) => str.trim())
    // get the key of
    switch (key) {
      case 'font-family':
        textStyle.fontName = {
          family: value,
          style: 'Regular',
        }
        break
      case 'font-size':
        textStyle.fontSize = parseFloat(value)
        break
      case 'font-weight':
        textStyle.fontName = {
          family: textStyle.fontName?.family || '',
          style: mapFontWeight(value),
        }
        break
      case 'line-height':
        // Check if the value is 'normal'
        if (value === 'normal') {
          textStyle.lineHeight = { unit: 'AUTO' } // Default value for 'normal'
        } else {
          textStyle.lineHeight = { value: parseFloat(value), unit: 'PIXELS' }
        }
        break
      case 'letter-spacing':
        // Check if the value is 'normal'
        if (value === 'normal') {
          textStyle.letterSpacing = { value: 0, unit: 'PERCENT' } // Default value for 'normal'
        } else {
          textStyle.letterSpacing = {
            value: parseFloat(value),
            unit: 'PERCENT',
          }
        }
        break
      default:
        console.warn(`Unknown property: ${key}`)
    }
  })

  return textStyle
}

async function loadFonts(
  formattedTextStyles: Partial<TextStyle>,
): Promise<string> {
  const fontFamilies: FontName[] = []

  // Extract font family from the formattedTextStyles
  const fontFamily = formattedTextStyles.fontName?.family
  const fontStyle = formattedTextStyles.fontName?.style || 'Regular'
  if (fontFamily) {
    const families = fontFamily
      .split(',')
      .map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
    for (const family of families) {
      fontFamilies.push({ family, style: fontStyle })
    }
  }

  // Load fonts using loadFontAsync and check if they are available
  for (const font of fontFamilies) {
    try {
      await figma.loadFontAsync(font)
      return font.family // Return the first loaded font family
    } catch (error) {
      console.warn(`Failed to load font family: ${font.family}`)
    }
  }

  // If no fonts are loaded, fallback to 'Inter' font family
  const fallbackFontFamily = 'Inter'
  await figma.loadFontAsync({ family: fallbackFontFamily, style: fontStyle })

  console.warn(`No available fonts found. Fallback to '${fallbackFontFamily}'.`)
  return fallbackFontFamily
}

function addFigmaTextStyles(
  formattedTextStyles: Partial<TextStyle>,
  fontFamily: string,
) {
  // Create a new text style in Figma
  const textStyle = figma.createTextStyle()
  textStyle.name = formattedTextStyles.name || 'Untitled Style'
  textStyle.fontName = {
    family: fontFamily,
    style: formattedTextStyles.fontName?.style || 'Regular',
  }
  if (formattedTextStyles.fontSize) {
    textStyle.fontSize = formattedTextStyles.fontSize
  }
  if (formattedTextStyles.lineHeight) {
    textStyle.lineHeight = formattedTextStyles.lineHeight
  }
  if (formattedTextStyles.letterSpacing) {
    textStyle.letterSpacing = formattedTextStyles.letterSpacing
  }

  // Add the text style to Figma's local styles
  figma.getLocalTextStyles().push(textStyle)
}

function mapFontWeight(value: string): string {
  // You might need to adjust this mapping according to the fonts available in Figma
  const fontWeightMapping: { [key: string]: string } = {
    '100': 'Thin',
    '200': 'Extra Light',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'Semi Bold',
    '700': 'Bold',
    '800': 'Extra Bold',
    '900': 'Black',
  }
  return fontWeightMapping[value] || 'Regular'
}

function convertToColor(value: string): SolidPaint {
  const hexMatch = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hexMatch) {
    const hex = hexMatch[0]
    return {
      type: 'SOLID',
      color: hexToRGB(hex),
    }
  }

  const rgbaMatch = value.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*((?:\d*\.)?\d+)\s*)?\)$/i,
  )
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1], 10) / 255
    const g = parseInt(rgbaMatch[2], 10) / 255
    const b = parseInt(rgbaMatch[3], 10) / 255
    const opacity = rgbaMatch[4] !== undefined ? parseFloat(rgbaMatch[4]) : 1

    return {
      type: 'SOLID',
      color: { r, g, b },
      opacity,
    }
  }

  const rgbMatch = value.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i)
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10) / 255
    const g = parseInt(rgbMatch[2], 10) / 255
    const b = parseInt(rgbMatch[3], 10) / 255

    return {
      type: 'SOLID',
      color: { r, g, b },
    }
  }

  const hslaMatch = value.match(
    /^hsla\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*(?:,\s*((?:\d*\.)?\d+)\s*)?\)$/i,
  )
  if (hslaMatch) {
    const h = parseInt(hslaMatch[1], 10) / 360
    const s = parseInt(hslaMatch[2], 10) / 100
    const l = parseInt(hslaMatch[3], 10) / 100
    const opacity = hslaMatch[4] !== undefined ? parseFloat(hslaMatch[4]) : 1

    const { r, g, b } = hslToRGB(h, s, l)

    return {
      type: 'SOLID',
      color: { r, g, b },
      opacity,
    }
  }

  const hslMatch = value.match(
    /^hsl\(\s*(\d+)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\);?$/i,
  )

  if (hslMatch) {
    const h = parseInt(hslMatch[1], 10) / 360
    const s = parseInt(hslMatch[2], 10) / 100
    const l = parseInt(hslMatch[3], 10) / 100

    const { r, g, b } = hslToRGB(h, s, l)

    return {
      type: 'SOLID',
      color: { r, g, b },
    }
  }

  throw new Error(`Unsupported color format: ${value}`)
}

function hexToRGB(hex: string): RGB {
  const hexMatch = hex.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hexMatch) {
    const cleanedHex =
      hexMatch[1].length === 3
        ? hexMatch[1]
            .split('')
            .map((c) => c + c)
            .join('')
        : hexMatch[1]
    const r = parseInt(cleanedHex.slice(0, 2), 16) / 255
    const g = parseInt(cleanedHex.slice(2, 4), 16) / 255
    const b = parseInt(cleanedHex.slice(4, 6), 16) / 255
    return { r, g, b }
  }

  throw new Error(`Invalid hex color format: ${hex}`)
}

function hslToRGB(h: number, s: number, l: number): RGB {
  let r, g, b

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  // Normalize the color values
  return { r, g, b }
}

function isStyleExists(styleName: string): boolean {
  const existingStyles = figma.getLocalPaintStyles()
  return existingStyles.some((style) => style.name === styleName)
}
