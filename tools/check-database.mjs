// Read-only diagnostics. Never print credentials or report contents.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {APP_ROOT,parseEnv,validateSettings} from '../server.mjs';

async function main(){
  let raw;
  try{raw=await readFile(path.join(APP_ROOT,'.env'),'utf8');}
  catch{console.error('Cannot read .env beside package.json. Copy .env.example to .env and fill it in.');return false;}
  let config;
  try{
    const values=parseEnv(raw);
    config=validateSettings({url:values.SUPABASE_URL,key:values.SUPABASE_PUBLISHABLE_KEY,table:values.SUPABASE_REPORTS_TABLE});
  }catch(error){console.error(error.message);return false;}
  if(!['user_reports','ReportSpotStatus'].includes(config.table)){
    console.error('Set SUPABASE_REPORTS_TABLE=user_reports in .env. This version uses the ERD table, not the legacy demo table.');return false;
  }
  console.log('.env URL and publishable key format are valid. Values are not displayed.');
  let healthy=true;
  const numeric=config.table==='ReportSpotStatus';
  for(const name of numeric?['ReportSpotStatus','latest_report_spot_status']:['user_reports','latest_spot_reports']){
    try{
      const columns=numeric?'report_id,spot_id,user_id,noise_level,crowd_level,notes,created_at':'report_id,spot_id,user_id,noise_level,crowd_levels,notes,time_reported';
      const response=await fetch(`${config.url}/rest/v1/${name}?select=${columns}&limit=1`,{
        headers:{apikey:config.key},signal:AbortSignal.timeout(12000),cache:'no-store'
      });
      if(response.ok){console.log(`${name}: read connection works.`);continue;}
      healthy=false;
      let code='';try{const data=await response.json();if(/^[A-Z0-9]{3,12}$/.test(data.code||''))code=data.code;}catch{}
      console.error(`${name}: HTTP ${response.status}${code?' ('+code+')':''}.`);
      if(code==='PGRST205'||code==='42P01')console.error(numeric?'The API cannot find this table/view. Use supabase/SETUP_PRESERVE_EXISTING.sql for the confirmed schema. If already seeded, check names and API exposure; do not reset existing rows.':'The API cannot find this table/view. Inspect your schema and use the matching setup file; do not reset existing tables.');
      else if(response.status===401)console.error('Check that the URL and publishable key belong to the same Supabase project.');
      else if(response.status===403||code==='42501')console.error('Check the migration grants and RLS policies. Do not disable RLS.');
      else console.error('Check the SQL setup and project status. Inspect detailed errors in Supabase without sharing credentials.');
    }catch{healthy=false;console.error(`${name}: network request failed or timed out. Check your internet connection and project status.`);}
  }
  if(healthy)console.log('Read connection verified. Now test Confirm report, then refresh and reopen the same spot to verify writes and persistence.');
  else console.error('Keep .env unchanged unless it points to the wrong project. Credentials alone do not create database tables.');
  return healthy;
}
process.exitCode=(await main())?0:1;
