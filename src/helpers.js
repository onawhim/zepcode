import colorExtensionTemplate from './templates/color-extension';
import customColorTemplate from './templates/custom-color';
import colorTemplate from './templates/color';
import linearGradientTemplate from './templates/linear-gradient';

function camelize(str) {
  return str.replace(/\W+(.)/g, (match, chr) => chr.toUpperCase());
}

function uiColor(color) {
  return colorTemplate(color);
}

function customUIColor(color) {
  return customColorTemplate(color);
}

export function generateColorExtension(colors, extensionOptions) {
  return {
    code: colorExtensionTemplate(colors, extensionOptions),
    mode: 'swift',
    filename: 'UIColor+AppColors.swift',
  };
}

export function cgColor(color, project, extensionOptions) {
  const styleguideColor = project.findColorEqual(color);
  const cgColorPostfix = '.cgColor';
  if (extensionOptions.useColorNames && styleguideColor) {
    return `UIColor.${styleguideColor.name}${cgColorPostfix}`;
  }
  if (extensionOptions.useCustomColorInitializer) {
    return customUIColor(color) + cgColorPostfix;
  }
  return uiColor(color) + cgColorPostfix;
}

export function generateFontExtension(textStyles) {
  const uniqueFonts = Array.from(
    new Set(textStyles.map(style => style.fontFace))
  ).sort();

  const fonfacesFunctions = uniqueFonts.map(styleName => {
    let result = '';
    result += `${' '.repeat(4)}static func ${camelize(
      styleName
    )}(ofSize: CGFloat) -> UIFont {\n`;
    result += `${' '.repeat(8)}`;
    result += `return UIFont(name: "${styleName}", size: size)!\n`;
    result += `${' '.repeat(4)}}`;
    return result;
  });

  let string = 'import UIKit\n\n';
  string += 'extension UIFont {\n';
  string += fonfacesFunctions.join('\n');
  string += '\n}';

  return {
    code: string,
    mode: 'swift',
    filename: 'UIFont+AppFonts.swift',
  };
}

export function options(context) {
  return {
    useColorNames: context.getOption('use_color_names'),
    useCustomColorInitializer: context.getOption(
      'use_custom_color_initializer'
    ),
  };
}

export function linearGradientLayer(gradient, project, extensionOptions) {
  const { colorStops } = gradient;
  const colorStopsString = colorStops
    .map(colorStop => cgColor(colorStop.color, project, extensionOptions))
    .join(', ');
  const colorStopsPositionString = colorStops
    .map((colorStop, index) => `${index}`)
    .join(', ');

  return linearGradientTemplate(
    gradient,
    colorStopsString,
    colorStopsPositionString
  );
}

export function radialGradientLayer(gradient, project, extensionOptions) {
  const { colorStops } = gradient;
  let colorStopsString = '';
  colorStops.forEach((colorStop, index) => {
    colorStopsString += cgColor(colorStop.color, project, extensionOptions);
    colorStopsString += `${index !== colorStops.length - 1 ? ', ' : ''}`;
  });

  let string = 'final class RadialGradientView: UIView {\n\n';
  string += `${' '.repeat(4)}private var radius: CGFloat {\n`;
  string += `${' '.repeat(8)}return min(bounds.width / 2, bounds.height / 2)\n`;
  string += `${' '.repeat(4)}}\n\n`;
  // Colors
  string += `${' '.repeat(4)}private let colors = [${colorStopsString}]\n\n`;

  // Inits
  string += `${' '.repeat(4)}override init(frame: CGRect) {\n`;
  string += `${' '.repeat(8)}super.init(frame: frame)\n`;
  string += `${' '.repeat(8)}clipsToBounds = true\n`;
  string += `${' '.repeat(4)}}\n\n`;

  string += `${' '.repeat(4)}required init?(coder aDecoder: NSCoder) {\n`;
  string += `${' '.repeat(
    8
  )}fatalError("init(coder:) has not been implemented")\n`;
  string += `${' '.repeat(4)}}\n\n`;

  // layoutSubviews
  string += `${' '.repeat(4)}override func layoutSubviews() {\n`;
  string += `${' '.repeat(8)}super.layoutSubviews()\n`;
  string += `${' '.repeat(8)}layer.cornerRadius = radius\n`;
  string += `${' '.repeat(4)}}\n\n`;

  //  Draw rect
  string += `${' '.repeat(4)}override func draw(_ rect: CGRect) {\n`;
  string += `${' '.repeat(8)}let context = UIGraphicsGetCurrentContext()\n\n`;
  string += `${' '.repeat(8)}let colorSpace = CGColorSpaceCreateDeviceRGB()\n`;
  string += `${' '.repeat(8)}let colorsCount = colors.count\n`;
  string += `${' '.repeat(
    8
  )}var locations = (0...colorsCount - 1).map { i in\n`;
  string += `${' '.repeat(12)}return CGFloat(i) / CGFloat(colorsCount)\n`;
  string += `${' '.repeat(8)}}\n\n`;
  string += `${' '.repeat(
    8
  )}guard let gradient = CGGradient(colorsSpace: colorSpace, colors: colors as CFArray, locations: locations) else {\n`;
  string += `${' '.repeat(12)}return\n`;
  string += `${' '.repeat(8)}}\n\n`;
  string += `${' '.repeat(8)}context?.drawRadialGradient(gradient,\n`;
  string += `${' '.repeat(35)}startCenter: center,\n`;
  string += `${' '.repeat(35)}startRadius: 0,\n`;
  string += `${' '.repeat(35)}endCenter: center,\n`;
  string += `${' '.repeat(35)}endRadius: radius,\n`;
  string += `${' '.repeat(
    35
  )}options: CGGradientDrawingOptions(rawValue: 0))\n`;
  string += `${' '.repeat(8)}}\n`;
  string += '}\n';
  return string;
}

export default {
  generateColorExtension,
  cgColor,
  generateFontExtension,
  options,
  linearGradientLayer,
  radialGradientLayer,
};
