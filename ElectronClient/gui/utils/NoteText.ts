export interface DefaultEditorState {
	value: string,
	markupLanguage: number, // MarkupToHtml.MARKUP_LANGUAGE_XXX
}

export interface OnChangeEvent {
	changeId: number,
	content: any,
}
