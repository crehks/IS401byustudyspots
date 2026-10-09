/* Database adapter: this file contains no project URL or key. */
(function(scope) {
  'use strict';
  const numericSpotIds=['hbll-commons','hbll-west','hbll-group','hbll-think','hbll-reading','hbll-single','hbll-upper','wsc-tables','wsc-lounge','wsc-1w-atrium','wsc-1w-nook','wsc-upper','wsc-2e-seating','wsc-2w-open','wsc-2w-corner','wsc-3e-hall','wsc-3e-corner','wsc-3w-open','wsc-3w-south','wsc-4f','wsc-5f','wsc-6f','jkb-tables','jkb-nook','jkb-group'];
  const levelNumber={low:1,medium:2,high:3};
  class StudyDatabase {
    constructor(fetcher=(...args)=>fetch(...args)) {
      this.fetcher=fetcher;this.config={configured:false,table:'user_reports'};this.reports={};this.ready=false;this.error='';this.loading=true;this.configLoaded=false;
    }
    async request(url,options={}) {
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),12000);
      try {return await this.fetcher(url,{...options,signal:controller.signal,cache:'no-store'});}
      catch(error) {throw new Error(error.name==='AbortError'?'The database request timed out. Check your connection and retry.':'Could not reach the database. Check the project URL and internet connection.');}
      finally {clearTimeout(timer);}
    }
    async initialize() {
      this.ready=false;this.error='';this.reports={};this.loading=true;this.configLoaded=false;
      try {
        if (scope.location?.protocol==='file:') {this.configLoaded=true;return this;}
        const response=await this.request('/api/config');
        if (!response.ok) throw new Error('Connection settings could not be loaded. Check .env or use npm start.');
        this.config=await response.json();this.configLoaded=true;
        if (this.config.configured) {await this.loadReports();this.ready=true;}
      } catch(error) {this.error=error.message;}
      finally {this.loading=false;}
      return this;
    }
    headers(extra={}) {return {apikey:this.config.key,...extra};}
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
    async submitReport(spotId,input) {
      if (!this.config.configured) throw new Error('Configure Supabase in .env before saving a database report.');
      if(this.loading)throw new Error('Wait for the connection check to finish.');
      if(!['user_reports','ReportSpotStatus'].includes(this.config.table))throw new Error('Set SUPABASE_REPORTS_TABLE=ReportSpotStatus in .env for your existing tables.');
      if (!['low','medium','high'].includes(input.noise) || !['low','medium','high'].includes(input.busy)) throw new Error('Choose a noise level and a crowding level.');
      const note=String(input.note || '').trim();
      if (note.length>240) throw new Error('Keep the report note to 240 characters.');
      const numeric=this.config.table==='ReportSpotStatus';
      const numericIndex=numericSpotIds.indexOf(spotId),numericId=numericIndex+1001;
      if(numeric&&numericIndex<0)throw new Error('This spot is not in the database sample inventory.');
      const payload=numeric?{spot_id:numericId,noise_level:levelNumber[input.noise],crowd_level:levelNumber[input.busy],notes:note}:{spot_id:spotId,noise_level:input.noise,crowd_levels:input.busy,notes:note};
      const response=await this.request(`${this.config.url}/rest/v1/${encodeURIComponent(this.config.table)}`,{method:'POST',headers:this.headers({'Content-Type':'application/json',Prefer:'return=representation'}),body:JSON.stringify(payload)});
      if (!response.ok) throw await this.apiError(response);
      const rows=await response.json();
      if (!Array.isArray(rows) || rows.length!==1) throw new Error('The insert did not return its saved row. Check SELECT permission and return=representation.');
      const report=this.rowToReport(rows[0]);
      if (report.spotId!==spotId || report.noise!==input.noise || report.busy!==input.busy || report.note!==note) throw new Error('The database response did not match the submitted report.');
      this.reports[spotId]=[report];this.ready=true;this.error='';return report;
    }
  }
  scope.StudyDatabase=StudyDatabase;
})(typeof window==='undefined'?globalThis:window);
