const getCaretText=function(cm){ //get caretText for checking dictionary
	const from=cm.getCursor();
	var ch=from.ch;
	if (ch>2) ch-=2; //include two char before
	//should check punc backward
	var caretText=cm.doc.getRange({line:from.line,ch},{line:from.line+1,ch:256});
	caretText=caretText.replace(/\r?\n/g,"");
	const m=caretText.match(/^[.？,。，！；「」『』—－：、（）｛｝【】《》]*(.*?)[.？,。，！；「」『』—－：、（）｛｝【】《》]/);
	if (m){
		caretText=m[1];
	}
	return caretText;
}
const selectionActivity=function(cm){
	const sels=cm.listSelections();	
	if (sels.length>0){
		const sel=sels[0];
		var ranges=[];
		for (let i=0;i<sels.length;i++) {
			ranges.push(this.kRangeFromSel(cm,sel.head,sel.anchor));
		}

		const selectionText=cm.doc.getSelection();
		const cursor=cm.getCursor();
		const cursorrange=this.kRangeFromCursor(cm);
		const r=this.cor.parseRange(cursorrange);
		this.props.setSelection&&this.props.setSelection({
				corpus:this.props.corpus,id:this.props.id,
				caretText:getCaretText(cm),selectionText,
				ranges, caretpos:r.start, caretposH:this.cor.stringify(r.start),
				index:cm.indexFromPos(cursor),
				cursor
			});
	}
}
module.exports=selectionActivity;