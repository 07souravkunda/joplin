const Setting = require('lib/models/Setting.js');
const { Platform } = require('react-native');

const globalStyle = {
	appearance: 'light',
	fontSize: 16,
	noteViewerFontSize: 16,
	margin: 15, // No text and no interactive component should be within this margin
	itemMarginTop: 10,
	itemMarginBottom: 10,
	backgroundColor: '#ffffff',
	color: '#555555', // For regular text
	colorError: 'red',
	colorWarn: '#9A5B00',
	colorFaded: '#777777', // For less important text
	fontSizeSmaller: 14,
	dividerColor: '#dddddd',
	selectedColor: '#e5e5e5',
	disabledOpacity: 0.2,
	urlColor: 'rgb(80,130,190)',
	codeColor: 'rgb(0,0,0)',

	raisedBackgroundColor: '#162B3D',// '#0080EF',
	raisedColor: '#f5f5f5',// '#003363',
	raisedHighlightedColor: '#ffffff',

	warningBackgroundColor: '#FFD08D',

	lineHeight: '1.6em',

	codeBackgroundColor: 'rgb(243, 243, 243)',
	codeBorderColor: 'rgb(220, 220, 220)',

	codeThemeCss: 'atom-one-light.css',
};

globalStyle.marginRight = globalStyle.margin;
globalStyle.marginLeft = globalStyle.margin;
globalStyle.marginTop = globalStyle.margin;
globalStyle.marginBottom = globalStyle.margin;

const themeCache_ = {};

function addExtraStyles(style) {
	if (!style.headerBackgroundColor) {
		style.headerBackgroundColor = style.appearance === 'light' ? '#F0F0F0' : '#2D3136';
	}

	if (!style.textSelectionColor) {
		style.textSelectionColor = style.appearance === 'light' ? '#0096FF' : '#00AEFF';
	}

	style.icon = {
		color: style.color,
		fontSize: 30,
	};

	style.lineInput = {
		color: style.color,
		backgroundColor: style.backgroundColor,
		borderBottomWidth: 1,
		borderColor: style.dividerColor,
		paddingBottom: 0,
	};

	if (Platform.OS === 'ios') {
		delete style.lineInput.borderBottomWidth;
		delete style.lineInput.borderColor;
	}

	style.buttonRow = {
		flexDirection: 'row',
		borderTopWidth: 1,
		borderTopColor: style.dividerColor,
		paddingTop: 10,
	};

	style.normalText = {
		color: style.color,
		fontSize: style.fontSize,
	};

	style.urlText = {
		color: style.urlColor,
		fontSize: style.fontSize,
	};

	style.headerStyle = {
		color: style.color,
		fontSize: style.fontSize * 1.2,
		fontWeight: 'bold',
	};

	style.headerWrapperStyle = {
		backgroundColor: style.headerBackgroundColor,
	};

	style.keyboardAppearance = style.appearance;

	return style;
}

function editorFont(fontId) {
	// IMPORTANT: The font mapping must match the one in Setting.js
	const fonts = {
		[Setting.FONT_DEFAULT]: null,
		[Setting.FONT_MENLO]: 'Menlo',
		[Setting.FONT_COURIER_NEW]: 'Courier New',
		[Setting.FONT_AVENIR]: 'Avenir',
		[Setting.FONT_MONOSPACE]: 'monospace',
	};
	if (!fontId) {
		console.warn('Editor font not set! Falling back to default font."');
		fontId = Setting.FONT_DEFAULT;
	}
	return fonts[fontId];
}

function themeStyle(theme) {
	if (!theme) {
		console.warn('Theme not set! Defaulting to Light theme.');
		theme = Setting.THEME_LIGHT;
	}

	const cacheKey = [theme].join('-');
	if (themeCache_[cacheKey]) return themeCache_[cacheKey];

	const output = Object.assign({}, globalStyle);
	if (theme == Setting.THEME_LIGHT) {
		// nothing
	} else if (theme == Setting.THEME_OLED_DARK) {
		output.appearance = 'dark';
		output.backgroundColor = '#000000';
		output.color = '#dddddd';
		output.colorFaded = '#777777';
		output.dividerColor = '#3D444E';
		output.selectedColor = '#333333';
		output.urlColor = 'rgb(166,166,255)';
		output.codeColor = '#ffffff';
		output.raisedBackgroundColor = '#0F2051';
		output.raisedColor = '#788BC3';
		output.raisedHighlightedColor = '#ffffff';
		output.tableBackgroundColor = 'rgb(0, 0, 0)';
		output.codeBackgroundColor = 'rgb(47, 48, 49)';
		output.codeBorderColor = 'rgb(70, 70, 70)';
		output.codeThemeCss = 'atom-one-dark-reasonable.css';
		output.colorBright = 'rgb(220,220,220)';
	} else if (theme == Setting.THEME_DARK) {
		output.appearance = 'dark';
		output.backgroundColor = '#1D2024';
		output.color = '#dddddd';
		output.colorFaded = '#777777';
		output.dividerColor = '#555555';
		output.selectedColor = '#333333';
		output.urlColor = '#7B81FF';
		output.appearance = 'dark';
		output.headerBackgroundColor = '#2D3136';
		output.raisedBackgroundColor = '#0F2051';
		output.raisedColor = '#788BC3';
		output.raisedHighlightedColor = '#ffffff';
		output.codeColor = '#ffffff';
		output.tableBackgroundColor = 'rgb(40, 41, 42)';
		output.codeBackgroundColor = 'rgb(47, 48, 49)';
		output.codeBorderColor = 'rgb(70, 70, 70)';
		output.codeThemeCss = 'atom-one-dark-reasonable.css';
		output.colorBright = 'rgb(220,220,220)';
	}

	themeCache_[cacheKey] = addExtraStyles(output);
	return themeCache_[cacheKey];
}

module.exports = { globalStyle, themeStyle, editorFont };
