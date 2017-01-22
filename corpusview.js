const React=require("react");
const E=React.createElement;
const PT=React.PropTypes;
const CMView=require("./cmview");
const {openCorpus}=require("ksana-corpus");
const {decorate,decorateUserField}=require("./decorate");
const selectionActivity=require("./selectionactivity");
const followLinkButton=require("./followlinkbutton");

const CorpusView=React.createClass({
	propTypes:{
		corpus:PT.string.isRequired,
		address:PT.oneOfType([PT.string.isRequired,PT.number.isRequired]),
		rawlines:PT.array.isRequired,
		article:PT.object.isRequired,
		theme:PT.string,
		layout:PT.bool, //layout with p?
		active:PT.bool, //in active tab
		onCursorActivity:PT.func,
		onViewport:PT.func,
		onCopyText:PT.func, //custom copy handler
		setSelection:PT.func, //used by selectionactivity
		updateArticleByAddress:PT.func,
		extraKeys:PT.object,
		fields:PT.object,
	}
	,getInitialState(){
		return {text:"",linebreaks:[],pagebreaks:[]};
	}
	,setupDecoratorActions(){
		//prepare actions for decorators
		this.actions={};
		for (let i in this.props) {
			if (typeof this.props[i]==="function") {
				this.actions[i]=this.props[i];
			}
		}
		this.actions.highlightAddress=this.highlightAddress;
	}
	,highlightAddress(address){
		const r=this.cor.parseRange(address);
		const {start,end}=this.toLogicalRange(r.kRange);
		this.highlight(start,end);
	}
	,clearLinkButtons(){
		if (this.linkbuttons) {
			this.linkbuttons.clear();
			this.linkbuttons=null;
		}
	}
	,clearHighlight(){
		if(this.highlighmarker) {
			this.highlighmarker.clear();		
			this.highlighmarker=null;
		}
	}
	,highlight(start,end){
		this.clearHighlight();
		this.highlighmarker=this.cm.markText(start,end,{className:"highlight",clearOnEnter:true});
	}
	,componentDidMount(){
		if (!this.props.corpus) {
			if(this.props.text) this.setState({text:this.props.text.join("\n")});
			return;
		}
		this.loadtext();
	}
	,loadtext(props){
		props=props||this.props;
		const {corpus,article,fields,rawlines,address,layout}=props;
		this.cor=openCorpus(corpus);
		this.markinview={};//fast check if mark already render, assuming no duplicate mark in same range
		this.markdone={};
		this.props.removeAllUserLinks&&this.props.removeAllUserLinks(corpus);
		this.setupDecoratorActions();
		decorateUserField.call(this,{},this.props.userfield);//this will unpaint all fields

		this.layout(article,rawlines,address,layout);
	}
	,textReady(){
		this.scrollToAddress(this.props.address);
		this.onViewportChange(this.cm);
	}
	,componentWillUnmount(){
		if (!this.cm)return;
		this.cm.getAllMarks().forEach((m)=>m.clear()); //might not need this
		this.cm.setValue("");
	}
	,shouldComponentUpdate(nextProps,nextState){
		return (nextProps.corpus!==this.props.corpus
			||nextProps.address!==this.props.address
			||nextProps.layout!==this.props.layout
			||nextState.text!==this.state.text);
	}
	,componentWillReceiveProps(nextProps){//cor changed
		const {corpus,address,layout,article}=this.props;
		if (nextProps.article.at!==article.at||nextProps.layout!==layout||nextProps.corpus!==corpus) {
			this.loadtext(nextProps);
			return;
		}

		if (nextProps.userfield && nextProps.userfield !== this.props.userfield
		||nextProps.activeUserfield!==this.props.activeUserfield) { //user field should have id
			decorateUserField.call(this,nextProps.userfield,this.props.userfield,nextProps.activeUserfield);
			//decorateUserField might clearWorking Link , call viewportchange to repaint
			this.onViewportChange();
			this.clearLinkButtons();
		}
		//if (this.cm && nextProps.active)this.cm.focus();

		if (this.props.address!==nextProps.address ) {
			this.scrollToAddress(nextProps.address);
		}
	}	
	,clearSelection(){
		const cursor=this.cm.getCursor();
		this.cm.doc.setSelection(cursor,cursor);
	}
	,toLogicalRange(range){
		return this.cor.toLogicalRange(this.state.linebreaks,range,this.getRawLine);
	}
	,fromLogicalPos(linech){
		if (!this.cor)return;
		const firstline=this.cor.bookLineOf(this.props.article.start); //first of of the article
		const text=this.cm.doc.getLine(linech.line);
		const lb=this.state.linebreaks[linech.line];
		if (typeof text==="undefined") return this.props.article.end;
		return this.cor.fromLogicalPos(text,linech.ch,lb,firstline,this.getRawLine);
	}
	,getRawLine(line){
		return this.props.rawlines[line];
	}
	,scrollToAddress(address){
		const r=this.cor.toLogicalRange(this.state.linebreaks,address,this.getRawLine);
		if (!r || r.start.line<0)return;
		if (this.viewer) this.viewer.jumpToRange(r.start,r.end);
		this.highlightAddress(address);
	}
	,layout(article,rawlines,address,playout){
		const cor=this.cor;
		const layouttag="p";

		if (!address){ //scroll to the selection after layout
			address=this.kRangeFromCursor(this.cm);
		}
		var book=cor.bookOf(article.start);

		const changetext=function({lines,pagebreaks,linebreaks}){
			const text=lines.join("\n");
			this.setState({linebreaks,pagebreaks,article,text}, this.textReady );
		}

		if (!playout) {
			changetext.call(this, cor.layoutText(rawlines,article.start) );
		} else {
			cor.getBookField(layouttag,book,(book_p)=>{
				if (!book_p) {
					console.error(layouttag,book);
					return;
				}
				const p=cor.trimField(book_p,article.start,article.end);
				changetext.call(this, cor.layoutText(rawlines,article.start,p.pos) );
			});
		}
	}
	,kRangeFromSel(cm,from,to){
		if (!this.cor)return;
		if (!from||!to)return 0;
		const f=this.cor.fromLogicalPos.bind(this.cor);
		const firstline=this.cor.bookLineOf(this.props.article.start); //first of of the article
		const s=f(cm.doc.getLine(from.line),from.ch,this.state.linebreaks[from.line],firstline,this.getRawLine,true);
		const e=f(cm.doc.getLine(to.line),to.ch,this.state.linebreaks[to.line],firstline,this.getRawLine,true);
		return this.cor.makeKRange(s,e);
	}
	,kRangeFromCursor(cm){
		if (!cm)return;
		const sels=cm.listSelections();
		if (!sels.length) return null;

		var from=sels[0].anchor,to=sels[0].head,temp;
		if (from.line>to.line||(from.line==to.line && from.ch>to.ch)) {
			temp=from;from=to;to=temp;
		}
		return this.kRangeFromSel(cm,from,to);
	}
	,onCut(cm,evt){
		/*1p178a0103-15 copy and paste incorrect*/
		/* TODO,  address error crossing a page, has line 30 */
		const krange=this.kRangeFromCursor(cm);

		if (this.props.copyText) { //for excerpt copy
			evt.target.value=this.props.copyText({cm,value:evt.target.value,krange,cor:this.cor});
			evt.target.select();
		} else { //default copy address
			evt.target.value="@"+this.cor.stringify(krange)+';';
			evt.target.select();//reselect the hidden textarea
		}
	}
	,noSelection(cm){
		const sels=cm.listSelections();	
		if (sels.length!==1)false;
		const s=sels[0].anchor,e=sels[0].head;
		return s.line==e.line&&s.ch==e.ch;
	}
	,showDictHandle(cm){
		this.dicthandle&&this.dicthandle.clear();
		if (!cm.hasFocus())return;
		var widget=document.createElement("span");
		widget.className="dicthandle";
		widget.innerHTML="佛光";
		this.dicthandle=cm.setBookmark(cm.getCursor(),{widget,handleMouseEvents:true});
	}
	,onBlur(cm){
		this.dicthandle&&this.dicthandle.clear();
	}
	,onCursorActivity(cm){
		if (!this.cor) return;
		clearTimeout(this.cursortimer);
		this.cursortimer=setTimeout(()=>{
			selectionActivity.call(this,cm);
			const kpos=this.fromLogicalPos(cm.getCursor());

			this.clearLinkButtons();
			if (this.noSelection(cm)) {
				this.linkbuttons=followLinkButton(cm,kpos,this.props.userfield,this.actions);
			}
			this.showDictHandle(cm);	
			this.props.onCursorActivity&&this.props.onCursorActivity(cm,kpos);
		},300);
	}
	,onViewportChange(cm,from,to){
		cm=cm||this.cm;
		if (!cm)return;
		clearTimeout(this.viewporttimer);
		this.viewporttimer=setTimeout(()=>{
			const vp=cm.getViewport();
			const from=this.fromLogicalPos({line:vp.from,ch:0});
			const to=this.fromLogicalPos({line:vp.to,ch:0});
			decorate.call(this,from,to,this.props.userfield);
			this.onViewport&&this.onViewport(cm,vp.from,vp.to,from,to); //extra params start and end kpos
			this.addresschanged=true;
		},50);
	}
	,setCM(cmviewer){
		if (cmviewer) {
			this.viewer=cmviewer;
			this.cm=cmviewer.getCodeMirror();
		}
	}
	,render(){
		if (!this.state.text) return E("div",{},"loading...");
		const props=Object.assign({},this.props,
			{ref:this.setCM,
			text:this.state.text,
			onCursorActivity:this.onCursorActivity,
			onCut:this.onCut,
			onBlur:this.onBlur,
			extraKeys:this.props.extraKeys,
			onViewportChange:this.onViewportChange,
			articlename:this.props.article.articlename,
			theme:this.props.theme
			}
		);
		return E(CMView,props);
	}
})
module.exports=CorpusView;