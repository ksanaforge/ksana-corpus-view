const React=require("react");
const E=React.createElement;
const PT=React.PropTypes;
const CMView=require("./cmview");
const openCorpus=require("ksana-corpus").openCorpus;
const getArticleHits=require("ksana-corpus-search").getArticleHits;
const decorate=require("./decorate").decorate;
const decorateUserField=require("./decorate").decorateUserField;
const decoratePageStarts=require("./decorate").decoratePageStarts;
const decorateHits=require("./decorate").decorateHits;
const selectionActivity=require("./selectionactivity");
const followLinkButton=require("./followlinkbutton");
const hitButton=require("./hitbutton");

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
		showPageStart:PT.bool
	}
	,getInitialState:function(){
		return {text:"",linebreaks:[],pagebreaks:[]};
	}
	,setupDecoratorActions:function(){
		//prepare actions for decorators
		this.actions={};
		for (var i in this.props) {
			if (typeof this.props[i]==="function") {
				this.actions[i]=this.props[i];
			}
		}
		this.actions.highlightAddress=this.highlightAddress;
	}
	,highlightAddress:function(address){
		const r=this.cor.parseRange(address);
		const k=this.toLogicalRange(r.kRange);;
		this.highlight(k.start,k.end);
	}
	,clearLinkButtons:function(){
		if (this.linkbuttons) {
			this.linkbuttons.clear();
			this.linkbuttons=null;
		}
	}
	,clearHitButtons:function(){
		if (this.hitbuttons) {
			this.hitbuttons.clear();
			this.hitbuttons=null;
		}
	}
	,clearHighlight:function(){
		if(this.highlighmarker) {
			this.highlighmarker.clear();		
			this.highlighmarker=null;
		}
	}
	,highlight:function(start,end){
		this.clearHighlight();
		this.highlighmarker=this.cm.markText(start,end,{className:"highlight",clearOnEnter:true});
	}
	,componentDidMount:function(){
		if (!this.props.corpus) {
			if(this.props.text) this.setState({text:this.props.text.join("\n")});
			return;
		}
		this.loadtext();
	}
	,loadtext:function(props){
		props=props||this.props;

		this.cor=openCorpus(props.corpus);
		this.markinview={};//fast check if mark already render, assuming no duplicate mark in same range
		this.markdone={};
		this.props.removeAllUserLinks&&this.props.removeAllUserLinks(props.corpus);
		this.setupDecoratorActions();

		decorateUserField.call(this,{},this.props.userfield);//this will unpaint all fields

		this.layout(props.article,props.rawlines,props.address,props.layout);
	}
	,textReady:function(){
		this.scrollToAddress(this.props.address);
		getArticleHits({cor:this.cor,lines:this.state.lines,linebreaks:this.state.linebreaks,
			article:this.props.article,
			pagebreaks:this.state.pagebreaks,searchresult:this.props.searchresult},function(hits){
				decorateHits.call(this,hits);
				this.articleHits=hits;
				this.onViewportChange(this.cm);

				if (this.props.showPageStart) {
					setTimeout(function(){
						decoratePageStarts.call(this);
					}.bind(this),100);
				}
		}.bind(this));
	}
	,componentWillUnmount:function(){
		if (!this.cm)return;
		this.cm.getAllMarks().forEach(function(m){m.clear()}); //might not need this
		this.cm.setValue("");
	}
	,shouldComponentUpdate:function(nextProps,nextState){
		return (nextProps.corpus!==this.props.corpus
			||nextProps.address!==this.props.address
			||nextProps.layout!==this.props.layout
			||nextState.text!==this.state.text);
	}
	,componentWillReceiveProps:function(nextProps){//cor changed
		if (nextProps.article.at!==this.props.article.at||
			nextProps.layout!==this.propslayout||nextProps.corpus!==this.props.corpus) {
			this.loadtext(nextProps);
			return;
		}

		if (nextProps.userfield && nextProps.userfield !== this.props.userfield
		||nextProps.activeUserfield!==this.props.activeUserfield) { //user field should have id
			decorateUserField.call(this,nextProps.userfield,this.props.userfield,nextProps.activeUserfield);
			//decorateUserField might clearWorking Link , call viewportchange to repaint
			this.onViewportChange();
			this.clearLinkButtons();
			this.clearHitButtons();
		}
		//if (this.cm && nextProps.active)this.cm.focus();

		//if (this.props.address!==nextProps.address ) {
		//	this.scrollToAddress(nextProps.address);
		//}
	}	
	,clearSelection:function(){
		const cursor=this.cm.getCursor();
		this.cm.doc.setSelection(cursor,cursor);
	}
	,toLogicalRange:function(range){
		return this.cor.toLogicalRange(this.state.linebreaks,range,this.getRawLine);
	}
	,fromLogicalPos:function(linech){
		if (!this.cor)return;
		const firstline=this.cor.bookLineOf(this.props.article.start); //first of of the article
		const text=this.cm.doc.getLine(linech.line);
		const lb=this.state.linebreaks[linech.line];
		if (typeof text==="undefined") return this.props.article.end;
		return this.cor.fromLogicalPos(text,linech.ch,lb,firstline,this.getRawLine);
	}
	,getRawLine:function(line){
		return this.props.rawlines[line];
	}
	,scrollToAddress:function(address){
		const r=this.cor.toLogicalRange(this.state.linebreaks,address,this.getRawLine);
		if (!r || r.start.line<0)return;
		if (this.viewer) this.viewer.jumpToRange(r.start,r.end);
		this.highlightAddress(address);
	}
	,layout:function(article,rawlines,address,playout){
		const cor=this.cor;
		const layouttag="p";

		if (!address){ //scroll to the selection after layout
			address=this.kRangeFromCursor(this.cm);
		}
		var book=cor.bookOf(article.start);

		const changetext=function(o){
			const text=o.lines.join("\n");
			this.setState({linebreaks:o.linebreaks,pagebreaks:o.pagebreaks,text:text,lines:o.lines}, this.textReady );
		}

		if (!playout) {
			changetext.call(this, cor.layoutText(rawlines,article.start) );
		} else {
			cor.getBookField(layouttag,book,function(book_p){
				if (!book_p) {
					console.error(layouttag,book);
					return;
				}
				const p=cor.trimField(book_p,article.start,article.end);
				changetext.call(this, cor.layoutText(rawlines,article.start,p.pos) );
			});
		}
	}
	,kRangeFromSel:function(cm,from,to){
		if (!this.cor)return;
		if (!from||!to)return 0;
		const f=this.cor.fromLogicalPos.bind(this.cor);
		const firstline=this.cor.bookLineOf(this.props.article.start); //first of of the article
		const s=f(cm.doc.getLine(from.line),from.ch,this.state.linebreaks[from.line],firstline,this.getRawLine,true);
		const e=f(cm.doc.getLine(to.line),to.ch,this.state.linebreaks[to.line],firstline,this.getRawLine,true);
		return this.cor.makeKRange(s,e);
	}
	,kRangeFromCursor:function(cm){
		if (!cm)return;
		const sels=cm.listSelections();
		if (!sels.length) return null;

		var from=sels[0].anchor,to=sels[0].head,temp;
		if (from.line>to.line||(from.line==to.line && from.ch>to.ch)) {
			temp=from;from=to;to=temp;
		}
		return this.kRangeFromSel(cm,from,to);
	}
	,onCut:function(cm,evt){
		/*1p178a0103-15 copy and paste incorrect*/
		/* TODO,  address error crossing a page, has line 30 */
		const krange=this.kRangeFromCursor(cm);

		if (this.props.copyText) { //for excerpt copy
			evt.target.value=this.props.copyText({cm:cm,value:evt.target.value,krange:krange,cor:this.cor});
			evt.target.select();
		} else { //default copy address
			evt.target.value="@"+this.cor.stringify(krange)+';';
			evt.target.select();//reselect the hidden textarea
		}
	}
	,noSelection:function(cm){
		const sels=cm.listSelections();	
		if (sels.length!==1)false;
		const s=sels[0].anchor,e=sels[0].head;
		return s.line==e.line&&s.ch==e.ch;
	}
	,showDictHandle:function(cm){
		this.dicthandle&&this.dicthandle.clear();
		if (!cm.hasFocus())return;
		var widget=document.createElement("span");
		widget.className="dicthandle";
		widget.innerHTML="佛光";
		this.dicthandle=cm.setBookmark(cm.getCursor(),{widget:widget,handleMouseEvents:true});
	}
	,onBlur:function(cm){
		this.dicthandle&&this.dicthandle.clear();
	}
	,onCursorActivity:function(cm){
		if (!this.cor) return;
		clearTimeout(this.cursortimer);
		this.cursortimer=setTimeout(function(){
			selectionActivity.call(this,cm);
			const kpos=this.fromLogicalPos(cm.getCursor());

			this.clearLinkButtons();
			this.clearHitButtons();
			if (this.noSelection(cm)) {
				this.linkbuttons=followLinkButton(cm,kpos,this.props.userfield,this.actions);
				this.hitbuttons=hitButton(cm,kpos,this.articleHits,this.actions);
			}
			//this.showDictHandle(cm);	
			this.props.onCursorActivity&&this.props.onCursorActivity(cm,kpos);
		}.bind(this),300);
	}
	,onViewportChange:function(cm,from,to){
		cm=cm||this.cm;
		if (!cm)return;
		clearTimeout(this.viewporttimer);
		this.viewporttimer=setTimeout(function(){
			const vp=cm.getViewport();
			const from=this.fromLogicalPos({line:vp.from,ch:0});
			const to=this.fromLogicalPos({line:vp.to,ch:0});
			decorate.call(this,from,to,this.props.userfield);
			this.onViewport&&this.onViewport(cm,vp.from,vp.to,from,to); //extra params start and end kpos
			this.addresschanged=true;
		}.bind(this),50);
	}
	,setCM:function(cmviewer){
		if (cmviewer) {
			this.viewer=cmviewer;
			this.cm=cmviewer.getCodeMirror();
		}
	}
	,render:function(){
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