const React=require("react");
const E=React.createElement;
const PT=React.PropTypes;
const CodeMirror=require("ksana-codemirror").Component;

const CMView=React.createClass({
	propTypes:{
		text:PT.string.isRequired
	}
	,componentDidMount:function(){
		this.loadText(this.props.text);
	}
	,shouldComponentUpdate:function(nextProps){
		return nextProps.text!==this.props.text;
	}
	,componentWillReceiveProps:function(nextProps){
		if (nextProps.text!==this.text) this.loadText(nextProps.text);
	}
	,loadText:function(newtext){
		this.text=newtext;
		this.cm.setValue(newtext);
	}
	,jumpToRange:function(from,to){
		const cm=this.cm;
		const cursor=cm.getCursor();
		/*
		if ((from.ch!==to.ch||from.line!==to.line)) {
			const s=cm.indexFromPos(from);const e=cm.indexFromPos(to);
			this.marktext&&this.marktext.clear&&this.marktext.clear();
			if (Math.abs(s-e)>1){
				this.marktext=cm.markText(from,to,{className:"gotomarker",clearOnEnter:true});					
			}
		}
		*/
		cm.scrollIntoView({line:0,ch:0});
		cm.setCursor(from);
		var coords=cm.cursorCoords(from,"local");
		coords.bottom+=cm.getScrollInfo().clientHeight*2/3;
		cm.scrollIntoView(coords);
		//cm.focus();
	}
	,scrollToText:function(t){
		var text=this.cm.getValue();
		var at=text.indexOf(t);
		if (at>-1) {
			var pos=this.cm.doc.posFromIndex(at);
			//scroll to last line , so that the paragraph will be at top
			cm.scrollIntoView({line:cm.doc.lineCount()-1,ch:0})
			if (pos.line) pos.line--;
			cm.scrollIntoView(pos);
		}
	}
	,getAllMarks:function(){
		return this.cm.getAllMarks();
	}
	,markText:function(){
		return this.cm.doc.markText.apply(cm.doc,arguments);
	}
	,getLine:function(i){
		return this.cm.getLine(i);
	}
	,onCopy:function(cm,evt){
		this.props.onCopy&&this.props.onCopy(cm,evt);
	}
	,onCut:function(cm,evt){
		this.props.onCut&&this.props.onCut(cm,evt);
	}
	,getCodeMirror:function(){
		return this.cm;
	}
	,setCM:function(cm){
		if (cm) this.cm=cm.getCodeMirror();
	}
	,render:function(){
		return E("div",{},
	  	E(CodeMirror,{ref:this.setCM,value:"",theme:this.props.theme,readOnly:true,
  	  onCursorActivity:this.props.onCursorActivity
  	  ,onCopy:this.onCopy
  	  ,onCut:this.onCut
  	  ,onFocus:this.props.onFocus
  	  ,onBlur:this.props.onBlur
  	  ,extraKeys:this.props.extraKeys
  	  ,onViewportChange:this.props.onViewportChange})
  	 )
	}
})
module.exports=CMView;