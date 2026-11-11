/* Database adapter: this file contains no project URL or key. */
// Configuration, reads, and inserts live here; UI rendering belongs in app.js.
(function(scope) {
  'use strict';
    // Array position plus 1001 gives the numeric sample spot ID. Never reorder this list.
const numericSpotIds=['hbll-commons','hbll-west','hbll-group','hbll-think','hbll-reading','hbll-single','hbll-upper','wsc-tables','wsc-lounge','wsc-1w-atrium','wsc-1w-nook','wsc-upper','wsc-2e-seating','wsc-2w-open','wsc-2w-corner','wsc-3e-hall','wsc-3e-corner','wsc-3w-open','wsc-3w-south','wsc-4f','wsc-5f','wsc-6f','jkb-tables','jkb-nook','jkb-group'];
  // The UI uses words; the team schema stores levels 1, 2, and 3.
  const levelNumber={low:1,medium:2,high:3};
  // Building IDs of the sample inventory in Supabase.
  const buildingIds={HBLL:1001,WSC:1002,JKB:1003};
  class StudyDatabase {
    // Tests inject a fake fetcher; the browser uses its normal fetch function.
    constructor(fetcher=(...args)=>fetch(...args)) {
      this.fetcher=fetcher;this.accessToken='';this.userId=null;this.config={configured:false,table:'user_reports'};this.reports={};this.ready=false;this.error='';this.loading=true;this.configLoaded=false;
    }
    // Bound network waits and avoid cached configuration or report responses.
    async request(url,options={}) {
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),12000);
      try {return await this.fetcher(url,{...options,signal:controller.signal,cache:'no-store'});}
      catch(error) {throw new Error(error.name==='AbortError'?'The database request timed out. Check your connection and retry.':'Could not reach the database. Check the project URL and internet connection.');}
      finally {clearTimeout(timer);}  
    }
    // Configured means settings exist; ready means reports also loaded successfully.
    async initialize() {
      this.ready=false;this.error='';this.reports={};this.loading=true;this.configLoaded=false;
      try {
        if (scope.location?.protocol==='file:') {this.configLoaded=true;return this;}
        this.config=await this.loadConfig();this.configLoaded=true;
        if (this.config.configured) {await this.loadReports();this.ready=true;await this.loadConditions().catch(()=>{});}
      } catch(error) {this.error=error.message;}
      finally {this.loading=false;this.configLoaded=true;}
      return this;
    }
    // Local runs read .env through the Node server. Static hosts (GitHub Pages) have no /api/config,
    // so fall back to the public settings in supabase-config.js. The path is relative so it also
    // works from a project subpath such as /repo-name/.
    async loadConfig() {
      try {
        const response=await this.request('api/config');
        if (response.ok) {const served=await response.json();if (served?.configured) return served;}
      } catch {}
      const shipped=scope.STUDY_BYU_CONFIG;
      if (shipped?.url&&shipped?.key) {
        // Same rule as the local server: https project URL and a browser-safe publishable key only.
        let origin='';try {const parsed=new URL(String(shipped.url));if (parsed.protocol==='https:'&&!parsed.search&&!parsed.hash&&['','/'].includes(parsed.pathname)) origin=parsed.origin;} catch {}
        if (!origin||!/^sb_publishable_[A-Za-z0-9_-]{8,}$/.test(String(shipped.key))) throw new Error('Supabase is not connected. supabase-config.js needs the project URL and an sb_publishable_ key.');
        return {configured:true,url:origin,key:String(shipped.key),table:shipped.table||'ReportSpotStatus'};
      }
      throw new Error('Supabase is not connected. Start with npm start and fill in .env, or add supabase-config.js when hosting statically.');
    }
    // Only the browser-safe publishable key is sent; server validation rejects secrets.
    // A signed-in user's access token (set by auth.js) makes requests run as that user.
    headers(extra={}) {return {apikey:this.config.key,...(this.accessToken?{Authorization:`Bearer ${this.accessToken}`}:{}),...extra};}
    // Translate API failures without exposing credentials or raw response contents.
    async apiError(response) {
      let result={};try {result=await response.json();} catch {}
      if (result.code==='PGRST205' || result.code==='42P01') return new Error(this.config.table==='ReportSpotStatus'?'ReportSpotStatus or latest_report_spot_status is missing from the API. Use SETUP_PRESERVE_EXISTING.sql for the confirmed schema and check Data API exposure. Do not reset existing rows.':'The reports table or latest-report view is missing from the Supabase API. Run the matching setup file for your schema; do not reset existing tables.');
      if (result.code==='PGRST204' || result.code==='42703') return new Error('The report columns do not match the adapter. Check the README column contract.');
      if (response.status===403 || result.code==='42501') return new Error('Supabase denied this action. Check table grants and row-level security policies.');
      if (response.status===401) return new Error('Supabase could not authorize this request. Check that the running app uses the same project settings as check:db.');
      if (response.status===429) return new Error('Too many requests. Wait a moment and retry.');
      if (result.code==='23503') return new Error('A required study spot or demo user is missing. Check the sample rows and foreign keys in the same project; do not run a legacy seed against your existing tables.');
      return new Error(`Supabase could not complete the request (HTTP ${response.status}). Check the table, constraints, and project status.`);
    }
    // Validate either supported schema and return the report shape expected by the UI.
    rowToReport(row) {
      if(this.config.table==='ReportSpotStatus'){
        const validId=value=>(Number.isSafeInteger(value)&&value>0)||(typeof value==='string'&&/^[1-9][0-9]*$/.test(value));
        const spotId=numericSpotIds[Number(row?.spot_id)-1001],time=Date.parse(row?.created_at);
        if(!row || !spotId || !validId(row.report_id) || !validId(row.user_id) || ![1,2,3].includes(row.noise_level) || ![1,2,3].includes(row.crowd_level) || !(row.notes===null || typeof row.notes==='string') || !Number.isFinite(time))throw new Error('Supabase returned an unexpected report shape. Run the existing-table setup and check numeric levels 1, 2, 3.');
        return {id:String(row.report_id),spotId,userId:String(row.user_id),noise:['','low','medium','high'][row.noise_level],busy:['','low','medium','high'][row.crowd_level],note:row.notes||'',time,source:'supabase'};
      }
      const time=Date.parse(row?.time_reported);
      if (!row || typeof row.spot_id!=='string' || typeof row.report_id!=='string' || typeof row.user_id!=='string' || !['low','medium','high'].includes(row.noise_level) || !['low','medium','high'].includes(row.crowd_levels) || typeof row.notes!=='string' || !Number.isFinite(time)) throw new Error('Supabase returned an unexpected report shape. Check the README column contract.');
      return {id:row.report_id,spotId:row.spot_id,userId:row.user_id,noise:row.noise_level,busy:row.crowd_levels,note:row.notes,time,source:'supabase'};
    }
    // Read one latest row per spot, rather than a campus-wide limit that could miss spots.
    async loadReports() {
      if(this.config.table==='ReportSpotStatus'){
        const query=new URLSearchParams({select:'report_id,spot_id,user_id,noise_level,crowd_level,notes,created_at',order:'created_at.desc,report_id.desc'});
        const response=await this.request(`${this.config.url}/rest/v1/latest_report_spot_status?${query}`,{headers:this.headers()});
        if(!response.ok)throw await this.apiError(response);
        const rows=await response.json();if(!Array.isArray(rows))throw new Error('Supabase returned an unexpected report response.');
        const reports={};for(const row of rows){const report=this.rowToReport(row);(reports[report.spotId]??=[]).push(report);}
        this.reports=reports;return reports;
      }
      if(this.config.table!=='user_reports')throw new Error('This ERD slice uses user_reports. Set SUPABASE_REPORTS_TABLE=user_reports in .env and run the migration plus seed.sql; the old demo table is not compatible.');
      const query=new URLSearchParams({select:'report_id,spot_id,user_id,noise_level,crowd_levels,notes,time_reported',order:'time_reported.desc,report_id.desc'});
      const response=await this.request(`${this.config.url}/rest/v1/latest_spot_reports?${query}`,{headers:this.headers()});
      if (!response.ok) throw await this.apiError(response);
      const rows=await response.json();
      if (!Array.isArray(rows)) throw new Error('Supabase returned an unexpected report response.');
      const reports={};
      for (const row of rows) {const report=this.rowToReport(row);(reports[report.spotId]??=[]).push(report);}
      this.reports=reports;return reports;
    }
    // Live noise/crowd per spot from approved AI-tagged reports in the last 45 minutes. null = no recent data.
    async loadConditions() {
      this.conditions=null;
      const response=await this.request(`${this.config.url}/rest/v1/rpc/space_conditions?p_window_minutes=45`,{headers:this.headers()});
      if (!response.ok) throw await this.apiError(response);
      const rows=await response.json();
      if (!Array.isArray(rows)) throw new Error('Supabase returned an unexpected conditions response.');
      const conditions={};
      for (const row of rows) {
        const spotId=numericSpotIds[Number(row?.space_id)-1001];
        if (!spotId) continue;
        const ok=v=>['low','medium','high'].includes(v)?v:null;
        conditions[spotId]={noise:ok(row.noise_level),busy:ok(row.crowd_level),count:Number(row.report_count)||0};
      }
      this.conditions=conditions;return conditions;
    }
    // Signed-in report: insert as pending, then ask the tag-report function to judge it.
    // A failed or slow tagging call leaves the report pending; it is retried server-side.
    async submitAiReport(spotId,input) {
      if (!this.accessToken) throw new Error('Log in to submit a report.');
      const index=numericSpotIds.indexOf(spotId);
      if (index<0) throw new Error('This spot is not in the database sample inventory.');
      if (!['low','medium','high'].includes(input.noise) || !['low','medium','high'].includes(input.busy)) throw new Error('Choose a noise level and a crowding level.');
      const body=String(input.note||'').trim()||`Noise ${input.noise}, crowding ${input.busy}.`;
      if (body.length>240) throw new Error('Keep the report note to 240 characters.');
      const response=await this.request(`${this.config.url}/rest/v1/spot_reports`,{method:'POST',headers:this.headers({'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify({space_id:index+1001,body,self_noise:input.noise,self_crowd:input.busy})});
      if (!response.ok) {
        const problem=await response.clone().json().catch(()=>({}));
        if (problem.code==='P0001'&&typeof problem.message==='string') throw new Error(problem.message);
        throw await this.apiError(response);
      }
      const rows=await response.json();
      if (!Array.isArray(rows)||rows.length!==1||!Number.isSafeInteger(rows[0].id)) throw new Error('The insert did not return its saved row.');
      // Up to 3 tagging tries (2s apart, stopping after ~15s); the server-side retry job covers anything left.
      let status='pending';const started=Date.now();
      for (let attempt=0;attempt<3&&status==='pending'&&Date.now()-started<15000;attempt++) {
        if (attempt) await new Promise(resolve=>setTimeout(resolve,2000));
        try {
          const tagged=await this.request(`${this.config.url}/functions/v1/tag-report`,{method:'POST',headers:this.headers({'Content-Type':'application/json'}),body:JSON.stringify({report_id:rows[0].id})});
          if (tagged.ok) {const result=await tagged.json();if (['approved','rejected'].includes(result?.status)) status=result.status;}
        } catch {}
      }
      if (status==='approved') await this.loadConditions().catch(()=>{});
      return {id:rows[0].id,status,spotId,noise:input.noise,busy:input.busy,note:body};
    }
        // Building hours live in their own table and do not affect reports.
    // Buildings IDs map to the codes the UI uses: 1001 HBLL, 1002 WSC, 1003 JKB.
    async loadHours() {
      if (!this.config.configured) return [];
      const codes={1001:'HBLL',1002:'WSC',1003:'JKB'};
      const query=new URLSearchParams({select:'building_id,day_of_week,special_date,open_time,close_time,is_closed,note'});
      const response=await this.request(`${this.config.url}/rest/v1/BuildingHours?${query}`,{headers:this.headers()});
      if (!response.ok) throw await this.apiError(response);
      const rows=await response.json();
      if (!Array.isArray(rows)) throw new Error('Supabase returned an unexpected hours response.');
      return rows.map(row=>({...row,building_code:codes[row.building_id]}));
    }
        // Each building's room-booking page lives on the Buildings table.
    async loadReservationLinks() {
      if (!this.config.configured) return {};
      const codes={1001:'HBLL',1002:'WSC',1003:'JKB'};
      const query=new URLSearchParams({select:'building_id,reservation_url'});
      const response=await this.request(`${this.config.url}/rest/v1/Buildings?${query}`,{headers:this.headers()});
      if (!response.ok) throw await this.apiError(response);
      const rows=await response.json();
      if (!Array.isArray(rows)) throw new Error('Supabase returned an unexpected buildings response.');
      const links={};
      for (const row of rows) {
        const code=codes[row.building_id];
        if (code&&typeof row.reservation_url==='string'&&row.reservation_url.startsWith('https://')) links[code]=row.reservation_url;
      }
      return links;
    }
    // Send only report inputs. The database supplies user, report ID, and timestamp.
    async submitReport(spotId,input) {
      if (!this.config.configured) throw new Error('Configure Supabase in .env before saving a database report.');
      if(this.loading)throw new Error('Wait for the connection check to finish.');
      if(!['user_reports','ReportSpotStatus'].includes(this.config.table))throw new Error('Set SUPABASE_REPORTS_TABLE=ReportSpotStatus in .env for your existing tables.');
      if (!['low','medium','high'].includes(input.noise) || !['low','medium','high'].includes(input.busy)) throw new Error('Choose a noise level and a crowding level.');
      const note=String(input.note || '').trim();
      if (note.length>240) throw new Error('Keep the report note to 240 characters.');
      // ReportSpotStatus is the team schema; user_reports is the fresh-schema variant.
      const numeric=this.config.table==='ReportSpotStatus';
      const numericIndex=numericSpotIds.indexOf(spotId),numericId=numericIndex+1001;
      if(numeric&&numericIndex<0)throw new Error('This spot is not in the database sample inventory.');
      const payload=numeric?{spot_id:numericId,noise_level:levelNumber[input.noise],crowd_level:levelNumber[input.busy],notes:note}:{spot_id:spotId,noise_level:input.noise,crowd_levels:input.busy,notes:note};
      // Signed-in users post as themselves; guests fall back to the database default (demo user).
      if(numeric&&this.userId)payload.user_id=this.userId;
      const response=await this.request(`${this.config.url}/rest/v1/${encodeURIComponent(this.config.table)}`,{method:'POST',headers:this.headers({'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(payload)});
      if (!response.ok) throw await this.apiError(response);
      const rows=await response.json();
      if (!Array.isArray(rows) || rows.length!==1) throw new Error('The insert did not return its saved row. Check SELECT permission and return=representation.');
      // Require the returned row to match the inputs before declaring a successful save.
      const report=this.rowToReport(rows[0]);
      if (report.spotId!==spotId || report.noise!==input.noise || report.busy!==input.busy || report.note!==note) throw new Error('The database response did not match the submitted report.');
      this.reports[spotId]=[report];this.ready=true;this.error='';return report;
    }
    // ---- Saved lists (account favorites) -------------------------------------------------
    // Lists live in "FavoritesList" (one row per list) and "Favorites" (one row per saved spot).
    // Row-level security limits every request to the signed-in user's own lists.
    listUrl(table,query='') {return `${this.config.url}/rest/v1/${encodeURIComponent(table)}${query?`?${query}`:''}`;}
    async listError(response) {
      let body={};try {body=await response.clone().json();} catch {}
      if (body.code==='23505') return new Error('You already have a list with that name.');
      if (body.code==='23514') return new Error(String(body.message||'').includes('two custom lists')?'You can have Favorites and two custom lists.':'Enter a list name from 1 to 28 characters.');
      return this.apiError(response);
    }
    requireUser() {
      if (!this.config.configured) throw new Error('Connect to the database to use saved lists.');
      if (!this.accessToken||!this.userId) throw new Error('Log in to use saved lists.');
    }
    // Returns [{dbId,name,spots:[frontend spot ids]}], oldest first. Creates Favorites if it is missing.
    async loadFavorites() {
      this.requireUser();
      const query=new URLSearchParams({select:'list_ID,list_name,Favorites(spot_ID)',order:'list_ID.asc'});
      const response=await this.request(this.listUrl('FavoritesList',query),{headers:this.headers()});
      if (!response.ok) throw await this.listError(response);
      const rows=await response.json();
      if (!Array.isArray(rows)) throw new Error('Supabase returned an unexpected saved-list response.');
      const lists=rows.map(row=>({dbId:Number(row.list_ID),name:String(row.list_name||''),spots:[...new Set((Array.isArray(row.Favorites)?row.Favorites:[]).map(f=>numericSpotIds[Number(f.spot_ID)-1001]).filter(Boolean))]}));
      if (!lists.some(l=>l.name.toLowerCase()==='favorites')) lists.unshift(await this.createList('Favorites'));
      return lists;
    }
    async createList(name) {
      this.requireUser();
      const clean=String(name||'').trim();
      if (clean.length<1||clean.length>28) throw new Error('Enter a list name from 1 to 28 characters.');
      const response=await this.request(this.listUrl('FavoritesList'),{method:'POST',headers:this.headers({'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify({user_id:this.userId,list_name:clean})});
      if (!response.ok) throw await this.listError(response);
      const rows=await response.json();
      if (!Array.isArray(rows)||rows.length!==1||!rows[0].list_ID) throw new Error('The list was not saved. Try again.');
      return {dbId:Number(rows[0].list_ID),name:String(rows[0].list_name),spots:[]};
    }
    // changes: [{dbId, has, want}] for one spot. Adds and removes only what differs.
    async setSpotLists(spotId,changes) {
      this.requireUser();
      const numeric=numericSpotIds.indexOf(spotId)+1001;
      if (numeric<1001) throw new Error('This spot is not in the database sample inventory.');
      const add=changes.filter(c=>c.want&&!c.has).map(c=>({list_ID:c.dbId,spot_ID:numeric}));
      const remove=changes.filter(c=>!c.want&&c.has).map(c=>c.dbId);
      if (add.length) {
        const response=await this.request(this.listUrl('Favorites',new URLSearchParams({on_conflict:'list_ID,spot_ID'})),{method:'POST',headers:this.headers({'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'}),body:JSON.stringify(add)});
        if (!response.ok) throw await this.listError(response);
      }
      if (remove.length) {
        const response=await this.request(this.listUrl('Favorites',new URLSearchParams({spot_ID:`eq.${numeric}`,list_ID:`in.(${remove.join(',')})`})),{method:'DELETE',headers:this.headers()});
        if (!response.ok) throw await this.listError(response);
      }
    }
        // Site ratings go to SiteRating. Anyone can submit; the page never reads them back.
    async submitRating(input) {
      if (!this.config.configured) throw new Error('The database is not connected yet. Try again in a moment.');
      const stars=Math.round(Number(input.stars));
      if (!(stars>=1&&stars<=5)) throw new Error('Choose a rating from 1 to 5 stars.');
      const comment=String(input.comment||'').trim();
      if (comment.length>500) throw new Error('Keep your comment to 500 characters.');
      const response=await this.request(`${this.config.url}/rest/v1/SiteRating`,{method:'POST',headers:this.headers({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify({stars,comment:comment||null})});
      if (!response.ok) throw await this.apiError(response);
    }
    // New-spot submissions go to the SpotSubmission table as 'pending'. They are write-only for
    // public clients, so the page does not read them back or show them in the catalogue.
    async submitSpot(input) {
      if (!this.config.configured) throw new Error('Configure Supabase in .env before saving a spot to the database.');
      if (this.loading) throw new Error('Wait for the connection check to finish.');
      const buildingId=buildingIds[input.building];
      if (!buildingId) throw new Error('Choose a building.');
      const name=String(input.name||'').trim(),detail=String(input.detail||'').trim();
      if (name.length<3||name.length>60) throw new Error('Enter a spot name from 3 to 60 characters.');
      if (detail.length>160) throw new Error('Keep location details to 160 characters.');
      if (!['low','medium','high'].includes(input.noise)) throw new Error('Choose the usual noise level.');
      const group=input.type==='group',capacity=group?Math.round(Number(input.capacity)):1;
      if (group&&!(capacity>=2&&capacity<=6)) throw new Error('Enter a group size from 2 to 6.');
      const payload={building_id:buildingId,floor_number:Number.isInteger(input.floorNumber)?input.floorNumber:null,floor_label:String(input.floorLabel||'').trim().slice(0,60),spot_name:name,spot_type_id:group?1002:input.private?1003:1001,capacity,noise_level:levelNumber[input.noise],outlets:!!input.outlets,is_private:!!input.private,location_details:detail||null};
      if(this.userId)payload.user_id=this.userId;
      if (!payload.floor_label) throw new Error('Choose a floor.');
      const response=await this.request(`${this.config.url}/rest/v1/SpotSubmission`,{method:'POST',headers:this.headers({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(payload)});
      if (!response.ok) throw await this.apiError(response);
      this.error='';
    }
  }
  // Expose the same adapter to browser code and Node-based tests.
  scope.StudyDatabase=StudyDatabase;
})(typeof window==='undefined'?globalThis:window);
