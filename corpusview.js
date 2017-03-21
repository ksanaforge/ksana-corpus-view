const React=require("react");
const E=React.createElement;
const PT=React.PropTypes;
const CMView=require("./cmview");

var search=null,filterMatch=null,stringifyRange=null;
try {
	openCorpus=require("ksana-corpus").openCorpus;
	getArticleHits=require("ksana-corpus-search").getArticleHits;
	stringifyRange=require("ksana-corpus").stringifyRange;
} catch(e){
	openCorpus=require("ksana-corpus-lib").openCorpus;
	getArticleHits=require("ksana-corpus-lib").getArticleHits;
	stringifyRange=require("ksana-corpus-lib").stringifyRange;
}

const decorate=require("./decorate").decorate;
const decorateUserField=require("./decorate").decorateUserField;
const decoratePageStarts=require("./decorate").decoratePageStarts;
const USER_FIELD_PREFIX=require("./decorate").USER_FIELD_PREFIX;
const decorateHits=require("./decorate").decorateHits;
const selectionActivity=require("./selectionactivity");
const followLinkButton=require("./followlinkbutton");
const hitButton=require("./hitbutton");
const hasUserLinkAt=require("./link").hasUserLinkAt;
const hasLinkAt=require("./link").hasLinkAt;

const CorpusView=React.createClass({
	propTypes:{
		corpus:PT.string,
		cor:PT.object,
		corpora:PT.object,//open corpus 
		address:PT.oneOfType([PT.string.isRequired,PT.number.isRequired]),
		rawlines:PT.array.isRequired,
		article:PT.object.isRequired,
		theme:PT.string,
		layout:PT.array,
		active:PT.bool, //in active tab
		onCursorActivity:PT.func,
		onViewport:PT.func,
		onCopyText:PT.func, //custom copy handler
		setSelection:PT.func, //used by selectionactivity
		updateArticleByAddress:PT.func,
		extraKeys:PT.object,
		fields:PT.object,
		userfield:PT.object,
		showPageStart:PT.bool
	}
	,getInitialState:function(){
		const updateTime=new Date();
		return {text:"",linebreaks:[],pagebreaks:[],updateTime};
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
		const k=this.toLogicalRange(r.range);;
		this.highlight(k.start,k.end);
	}
	,clearLinkButtons:function(){
		if (this.userlinkbuttons) {
			this.userlinkbuttons.clear&&this.userlinkbuttons.clear();
			this.userlinkbuttons=null;
		}
		if (this.multilinkbuttons) {
			this.multilinkbuttons.clear&&this.multilinkbuttons.clear();
			this.multilinkbuttons=null;
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
		if (!this.props.corpus && !this.props.cor) {
			if(this.props.text) this.setState({text:this.props.text.join("\n")});
			return;
		}
		this.loadtext();
	}
	,loadtext:function(props){
		props=props||this.props;

		this.cor=props.cor?props.cor:openCorpus(props.corpus);
		this.markinview={};//fast check if mark already render, assuming no duplicate mark in same range
		this.markdone={};
		props.removeAllUserLinks&&props.removeAllUserLinks(props.corpus);
		this.setupDecoratorActions();
		decorateUserField.call(this,{},props.userfield);//this will unpaint all fields

		this.layout(props.article,props.rawlines,props.address,props.layout);
	}
	,textReady:function(){
		getArticleHits({cor:this.cor,lines:this.state.lines,linebreaks:this.state.linebreaks,
			article:this.props.article,
			pagebreaks:this.state.pagebreaks,searchresult:this.props.searchresult},function(hits){
				decorateHits.call(this,hits);

				this.articleHits=hits;
				this.onViewportChange(this.cm);

				if (this.props.showPageStart) {
					setTimeout(function(){
						decoratePageStarts.call(this);
					}.bind(this),10);
				}
				this.scrollToAddress(this.props.address);

		}.bind(this));
	}
	,componentWillUnmount:function(){
		this._unmounted=true;
		if (!this.cm)return;
		this.cm.getAllMarks().forEach(function(m){m.clear()}); //might not need this
		this.cm.setValue("");
	}
	,shouldComponentUpdate:function(nextProps,nextState){
		const scu=(  nextProps.corpus!==this.props.corpus||nextProps.cor!==this.props.cor
			||nextProps.address!==this.props.address
			||nextProps.layout!==this.props.layout
			||nextProps.fields!==this.props.fields
			||nextState.text!==this.state.text);
		return scu;
	}
	,inViewPort:function(line){
		const vp=this.cm.getViewport();
		const from=vp.from,to=vp.to;
		return (line>=from && line<=vp.to);
	}
	,removeDeleteFields:function(fields){
		const newmarkinview={};
		for (var id in this.markinview){
			const type=id.match(/(.*?)_/)[1];
			if (!fields[type] && type[0]!==USER_FIELD_PREFIX) { //user field
				this.markinview[id]&&this.markinview[id].clear();
			} else {
				newmarkinview[id]=this.markinview[id];
			}
		};
		this.markinview=newmarkinview;
	}
	,componentWillReceiveProps:function(nextProps){//cor changed
		if (nextProps.article.at!==this.props.article.at||
			nextProps.layout!==this.props.layout||nextProps.corpus!==this.props.corpus||nextProps.cor!==this.props.cor) {
			this.loadtext(nextProps);
			return;
		}

		if (nextProps.fields!==this.props.fields) {
			this.removeDeleteFields(nextProps.fields);
			this.onViewportChange();			
		}

		if (nextProps.userfield && nextProps.userfield !== this.props.userfield) { //user field should have id			
//			if (Object.keys(nextProps.userfield).length)debugger
			decorateUserField.call(this,nextProps.userfield,this.props.userfield);
			//decorateUserField might clearWorking Link , call viewportchange to repaint
			this.onViewportChange();
			this.clearLinkButtons();
			this.clearHitButtons();
		}

		//if (this.cm && nextProps.active)this.cm.focus();

		if (this.props.address!==nextProps.address ) { //need by updateArticleByAddress
			const r=this.cor.toLogicalRange(this.state.linebreaks,nextProps.address,this.getRawLine);
			if (!r || r.start.line<0)return;

			if (!this.inViewPort(r.start.line)) {
				this.scrollToAddress(nextProps.address);
			} else {
				if (this.noSelection(this.cm)) {
					this.cm.setCursor(r.start);
				}
			}
		}
	}	
	,clearSelection:function(){
		const cursor=this.cm.getCursor();
		this.cm.doc.setSelection(cursor,cursor);
	}
	,toLogicalRange:function(range){
		return this.cor.toLogicalRange(this.state.linebreaks,range,this.getRawLine);
	}
	,toLogicalPos:function(kpos,tailing){
		return this.cor.toLogicalPos(this.state.linebreaks,kpos,this.getRawLine,tailing);
	}
	,fromLogicalPos:function(linech){
		if (!this.cor)return;
		const firstline=this.cor.bookLineOf(this.props.article.start); //first of of the article
		const text=this.cm.doc.getLine(linech.line);
		const lb=this.state.linebreaks[linech.line];
		if (typeof text==="undefined") return this.props.article.end;
		return this.cor.fromLogicalPos(text,linech,lb,firstline,this.getRawLine);
	}
	,getRawLine:function(line){
		return this.props.rawlines[line];
	}
	,scrollToAddress:function(address){
		const r=this.cor.toLogicalRange(this.state.linebreaks,address,this.getRawLine);
		if (!r || r.start.line<0)return;
		if (this.viewer) {
			if (r.start==r.end) {
				const rr=this.cor.toLogicalPos(this.state.linebreaks,address,this.getRawLine,true);
				this.viewer.jumpToRange(rr,rr,this.highlightAddress.bind(this,address));
			} else {
				this.viewer.jumpToRange(r.start,r.end,this.highlightAddress.bind(this,address));
			}
		}
	}
	,layout:function(article,rawlines,address,playout){
		if (!rawlines) {
			return;
		}
		const cor=this.cor;
		if (!address){ //scroll to the selection after layout
			address=this.kRangeFromCursor(this.cm);
		}
		const o=cor.layoutText(rawlines,article.start,playout)
		const text=o.lines.join("\n");
		const updateTime=new Date();
		this.setState({updateTime,linebreaks:o.linebreaks,pagebreaks:o.pagebreaks,text:text,lines:o.lines}, this.textReady );
	}
	,kRangeFromSel:function(cm,from,to){
		if (!this.cor)return;
		if (!from||!to)return 0;
		const f=this.cor.fromLogicalPos.bind(this.cor);
		const firstline=this.cor.bookLineOf(this.props.article.start); //first of of the article
		const s=f(cm.doc.getLine(from.line),from,this.state.linebreaks[from.line],firstline,this.getRawLine,true);
		const e=f(cm.doc.getLine(to.line),to,this.state.linebreaks[to.line],firstline,this.getRawLine,true);
		return this.cor.makeRange(s,e);
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
		const krange=this.kRangeFromCursor(cm);
		evt.target.value=this.cor.stringify(krange);
		evt.target.select();//reselect the hidden textarea
	}
	,onCopy:function(cm,evt){
		/*1p178a0103-15 copy and paste incorrect*/
		/* TODO,  address error crossing a page, has line 30 */
		const krange=this.kRangeFromCursor(cm);
		if (this.props.copyText) { //for excerpt copy
			evt.target.value=this.props.copyText({cm:cm,value:evt.target.value,krange:krange,cor:this.cor});
			evt.target.select();
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
	,autoFollow(linkbuttons){
		const widget=linkbuttons&&linkbuttons.replacedWith;
		if (widget){
			var target=widget;
			if (target.children.length==1) target=target.children[0];
			const mouseover=widget.onmouseoever||widget.children[0].onmouseover;
			const mousedown=widget.onmouseodown||widget.children[0].onmousedown;
			if (!mouseover&&!mousedown) return;

			setTimeout(function(){
				mouseover&&mouseover({target});
				mousedown&&mousedown({target});				
				linkbuttons.clear();
			},5);
		}
	}
	,onCursorActivity:function(cm){
		if (!this.cor) return;
		clearTimeout(this.cursortimer);
		this.cursortimer=setTimeout(function(){
			if (this._unmounted)return;
			const cursor=cm.getCursor();
			const kpos=this.fromLogicalPos(cursor);
			selectionActivity.call(this,cm);

			this.clearLinkButtons();
			this.clearHitButtons();
			this.clearHighlight();
			if (this.noSelection(cm)) {				
				const userlinks=hasUserLinkAt(kpos,this.props.userfield);
				this.userlinkbuttons=followLinkButton(cm,userlinks,this.actions,this.props.corpora);

				const multilinks=hasLinkAt(this.cor,kpos,this.props.fields,this.props.corpora,stringifyRange);

				this.multilinkbuttons=(this.props.followLinks||followLinkButton)(cm,multilinks,this.actions,this.props.corpora);
				//custom buttons return false (too few links), use default 
				if (!this.multilinkbuttons) {
					this.multilinkbuttons=followLinkButton(cm,multilinks,this.actions,this.props.corpora);
				}
				const updateSince=new Date() - this.state.updateTime;

				//prevent update from aux to trigger change to aux
				if(this.props.autoFollowSingleLink && updateSince>1500){
					this.autoFollow(this.multilinkbuttons);
				}
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
			var to=this.fromLogicalPos({line:vp.to,ch:0});
			if (to<from) to=this.props.article.end;
			decorate.call(this,from,to);
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
			onCopy:this.onCopy,
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