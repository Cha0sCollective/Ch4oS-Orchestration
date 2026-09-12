import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ch4os-transport-'));
  const config = join(root,'host.json');
  await writeFile(config,JSON.stringify({version:1,inferencePolicy:'local-only',dataDir:join(root,'state'),leaseDir:join(root,'lease'),repositories:[{id:'fixture',root,allowPaths:['.']}],models:[],profiles:[]}));
  return {root,config,cli:fileURLToPath(new URL('../cli.js',import.meta.url))};
}
test('MCP stdio negotiates and exposes all five bounded operations',async()=>{
  const f=await fixture();
  const transport=new StdioClientTransport({command:process.execPath,args:[f.cli,'mcp','--config',f.config],stderr:'pipe'});
  const client=new Client({name:'qualification-test',version:'1.0.0'});
  try {
    await client.connect(transport);
    const list=await client.listTools();
    assert.deepEqual(list.tools.map(t=>t.name).sort(),['cancel_task','capabilities','get_task','record_feedback','start_task']);
    const response=await client.callTool({name:'capabilities',arguments:{}});
    assert.equal((response.structuredContent as any).provider.locality,'local');
    const bad=await client.callTool({name:'start_task',arguments:{provider:'openrouter'}});
    assert.equal(bad.isError,true);
    const unknown=await client.callTool({name:'get_task',arguments:{jobId:'12345678-1234-4123-8123-123456789abc'}});
    assert.equal(unknown.isError,true);
  } finally { await client.close(); await transport.close(); await rm(f.root,{recursive:true,force:true}); }
});
test('newline CLI exposes the same local-only capabilities and structured failures',async()=>{
  const f=await fixture();
  const child=spawn(process.execPath,[f.cli,'serve','--config',f.config],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  const lines=createInterface({input:child.stdout});
  const responses:any[]=[];lines.on('line',line=>responses.push(JSON.parse(line)));
  const exited=once(child,'exit');
  child.stdin.end(JSON.stringify({id:1,method:'capabilities',params:{}})+'\n'+JSON.stringify({id:2,method:'start_task',params:{provider:'openrouter'}})+'\n');
  try {
    const [code]=await exited;assert.equal(code,0);
    assert.equal(responses[0].result.provider.locality,'local');assert.equal(responses[1].error.code,'invalid_request');
  } finally { lines.close(); if(child.exitCode===null)child.kill();await rm(f.root,{recursive:true,force:true}); }
});
test('newline CLI rejects an oversized unterminated request',async()=>{
  const f=await fixture();
  const child=spawn(process.execPath,[f.cli,'serve','--config',f.config],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  let diagnostic='';child.stderr.on('data',chunk=>diagnostic+=chunk);
  child.stdin.on('error',()=>{});
  const exited=once(child,'close');
  child.stdin.write('x'.repeat(262145));
  try {
    const [code]=await exited;
    assert.equal(code,1);assert.match(diagnostic,/input_limit/);
  } finally {child.stdin.destroy();if(child.exitCode===null)child.kill();await rm(f.root,{recursive:true,force:true});}
});
