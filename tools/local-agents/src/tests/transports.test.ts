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

test('context probe requires a profile when one model has multiple limit sets',async()=>{
  const f=await fixture();
  const config={
    version:1,inferencePolicy:'local-only',dataDir:join(f.root,'state'),leaseDir:join(f.root,'lease'),
    allowQualification:true,
    limits:{contextTokens:262144,outputTokens:2048,inputBytes:131072,rounds:8,taskTimeoutMs:5000,
      checkTimeoutMs:5000,maxFiles:16,maxFileBytes:65536,snapshotBytes:262144,toolOutputBytes:8192,resultBytes:32768},
    repositories:[{id:'fixture',root:f.root,allowPaths:['.'],excludes:[]}],
    models:[{id:'local',provider:'ollama',model:'test',digest:'a'.repeat(64),quantization:'Q4',think:false,temperature:0}],
    profiles:[
      {id:'small',modelId:'local',taskClasses:['exploration'],instruction:'small',limits:{contextTokens:8192,inputBytes:16384}},
      {id:'large',modelId:'local',taskClasses:['summary'],instruction:'large',limits:{contextTokens:16384,inputBytes:32768}},
    ],
  };
  await writeFile(f.config,JSON.stringify(config));
  const child=spawn(process.execPath,[f.cli,'probe-context','--config',f.config,'--model-id','local'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  let diagnostic='';child.stderr.on('data',chunk=>diagnostic+=chunk);
  try {
    const [code]=await once(child,'close');
    assert.equal(code,1);assert.match(diagnostic,/Select --profile-id.*multiple profile limit sets/);
  } finally {if(child.exitCode===null)child.kill();await rm(f.root,{recursive:true,force:true});}
});
