const {handler}=require("../lib/ai-gateway");
const {adapters,configured}=require("../lib/ai-provider");
module.exports=handler(configured()?adapters():{});
