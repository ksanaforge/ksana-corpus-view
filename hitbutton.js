const React=require("react");
const ReactDOM=require("react-dom");
const E=React.createElement;
const hasHitAt=require("./link").hasHitAt;
const _=require("ksana-localization")._;
const openCorpus=require("ksana-corpus").openCorpus;

const HitButtons=React.createClass({
	prev(){
		const phrasehits=this.props.articlehits[this.props.phrase].hits;
		const n=this.props.nhit-1;
		if (n>=0) {
			this.props.updateArticleByAddress(phrasehits[n]);
		}
	},
	next(){
		const phrasehits=this.props.articlehits[this.props.phrase].hits;
		const n=this.props.nhit+1;
		if (n<phrasehits.length) {
			this.props.updateArticleByAddress(phrasehits[n]);
		}
	},
	render:function(){
		return E("div",{},
			E("span",{className:"hitbutton",onClick:this.prev},_("Prev Hit")),
			" ",
			E("span",{className:"hitbutton",onClick:this.next},_("Next Hit"))
		);
	}
})

const hitButton=function(cm,kpos,articlehits,actions){
	const phrasehit=hasHitAt(kpos,articlehits);
	if (!phrasehit) return null;
	var widget=document.createElement("span");
	widget.className="hitbuttongroup";
	ReactDOM.render(E(HitButtons,{articlehits:articlehits,nhit:phrasehit.nhit,
		updateArticleByAddress:actions.updateArticleByAddress,  phrase:phrasehit.phrase}),widget);

	const insertat={line:cm.getCursor().line,ch:cm.getCursor().ch}
	return cm.setBookmark(insertat,{widget:widget,handleMouseEvents:false});	
}

module.exports=hitButton;
