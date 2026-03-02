import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  const transport = new SSEClientTransport(new URL("http://127.0.0.1:3845/sse"));
  const client = new Client({ name: "query", version: "1.0" }, { capabilities: {} });
  
  await client.connect(transport);
  
  const result = await client.request(
    { method: "tools/call", params: { name: "get_design_context", arguments: { nodeId: "124-24357" } } },
    Object
  );
  
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
