const getCaretText=function(cm,sel){ //get caretText for checking dictionary
	var line=sel.head.line,ch=sel.head.ch;
	//get caret from left of selection
	if (sel.head.line>sel.anchor.line ||
		 (sel.head.line==sel.anchor.line && sel.anchor.ch<sel.head.ch)) {
		line=sel.anchor.line,ch=sel.anchor.ch;
	}
	//if (ch>1) ch-=1; //include two char before
	//should check punc backward
	var caretText=cm.doc.getRange({line:line,ch:ch},{line:line+1,ch:256});
	caretText=caretText.replace(/\r?\n/g,"");
	const m=caretText.match(/^[.？,。，！；「」『』—－：、（）〈〉｛｝【】《》]*(.*?)[.？,。，！；「」『』—－：、（）｛｝【】〈〉《》]/);
	if (m){
		caretText=m[1];
	}
	return caretText;
}
/*
	from caret, return first n token and it's kpos
	for DharmaCAT
*/
const getCaretTexts=function(cm,sel,cor,fromlogicalpos){
	var line=sel.head.line,ch=sel.head.ch;
	//get caret from left of selection
	if (sel.head.line>sel.anchor.line ||
		 (sel.head.line==sel.anchor.line && sel.anchor.ch<sel.head.ch)) {
		line=sel.anchor.line,ch=sel.anchor.ch;
	}
	const start=cm.indexFromPos({line,ch});
	const startkpos=fromlogicalpos({line,ch});
	var now=start+1;
	var max=20,count=0,prevkpos=0;
	const alltext=cm.doc.getValue();
	var out=[];
	while (count<max) {
		var caretText=alltext.substring(start,now);
		const linech=cm.posFromIndex(now);
		const kpos=fromlogicalpos(linech);
		if (kpos>prevkpos &&caretText) {
			out.push([caretText,cor.makeRange(startkpos,kpos)]);
		} else if (kpos) {
			break;
		}
		now++;
		count++;
		prevkpos=kpos;
	}
	return out;
}

const selectionActivity=function(cm,cor,fromlogicalpos){

	const sels=cm.listSelections();	
	if (sels.length>0){
		const sel=sels[0];
		var ranges=[],selections=[];
		for (var i=0;i<sels.length;i++) {
			ranges.push(this.kRangeFromSel(cm,sel.head,sel.anchor));
			if (sel.anchor.line==sel.head.line&&
				sel.anchor.ch<sel.head.ch) {
				selections.push([sel.anchor,sel.head]);	
			} else {
				selections.push([sel.head,sel.anchor]);
			}
		}

		const selectionText=cm.doc.getSelection();
		const cursor=cm.getCursor();
		const cursorrange=this.kRangeFromCursor(cm);
		const r=this.cor.parseRange(cursorrange);
		this.props.setSelection&&this.props.setSelection({
				cm:cm,
				sels:sels,
				selections:selections,
				corpus:this.props.corpus,id:this.props.id,
				caretText:getCaretText(cm,sel),
				caretTexts:getCaretTexts(cm,sel,cor,fromlogicalpos),
				selectionText:selectionText,
				ranges:ranges, caretpos:r.start, caretposH:this.cor.stringify(r.start),
				index:cm.indexFromPos(cursor),
				cursor:cursor
			});
	}
}
module.exports=selectionActivity;