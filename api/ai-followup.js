const {handler}=require("../lib/ai-gateway");
const {adapters}=require("../lib/ai-provider");
module.exports=handler(adapters());
