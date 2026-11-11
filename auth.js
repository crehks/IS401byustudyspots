/* Auth adapter: Supabase Auth (GoTrue REST) + the linked public."User" row.
 * Uses the same publishable key as database.js; passwords go only to Supabase Auth over HTTPS. */
(function(scope) {
  'use strict';
  const SESSION_KEY='studybyu.auth.v1';
  class StudyAuth {
    constructor(database,storage) {
      this.db=database;this.storage=storage??(()=>{try{return scope.localStorage}catch{return null}})();
      this.session=null;this.profile=null;this.listeners=new Set();
    }
    get signedIn() {return !!(this.session&&this.profile);}
    get userId() {return this.profile?.user_id??null;}
    get displayName() {return this.profile?.first_name||'';}
    // Shows the Dev tools menu only. Cosmetic: every admin action is still checked by the database.
    get isAdmin() {
      try{const part=String(this.session?.access_token||'').split('.')[1];return JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')))?.app_metadata?.role==='admin'}catch{return false}
    }
    onChange(fn) {this.listeners.add(fn);}
    emit() {for(const fn of this.listeners){try{fn(this)}catch{}}}
    store() {try{if(this.session)this.storage?.setItem(SESSION_KEY,JSON.stringify(this.session));else this.storage?.removeItem(SESSION_KEY)}catch{}}
    // Apply or clear the access token so database requests are made as this user.
    setSession(session) {
      this.session=session;this.db.accessToken=session?.access_token||'';
      if(!session)this.profile=null;
      this.store();this.scheduleRefresh();
    }
    // Access tokens last about an hour; renew one minute early so long visits stay signed in.
    scheduleRefresh() {
      clearTimeout(this.timer);
      if(!this.session?.refresh_token||!this.session.expires_at)return;
      const wait=Math.max(5000,this.session.expires_at*1000-Date.now()-60000);
      this.timer=setTimeout(()=>{void this.refresh()},Math.min(wait,2147483647));
      this.timer?.unref?.();
    }
    async refresh() {
      try{
        const result=await this.authRequest('token?grant_type=refresh_token',{refresh_token:this.session.refresh_token});
        this.setSession(this.normalize(result));
      } catch{this.setSession(null);this.db.userId=null;this.emit();}
    }
    normalize(s) {return {access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600)};}
    authUrl(path) {return `${this.db.config.url}/auth/v1/${path}`;}
    // Where the emailed link returns to: this page without any query or hash. Supabase only honours it
    // when it is on the project's redirect allow-list; otherwise it falls back to the Site URL.
    returnUrl() {
      const loc=scope.location;
      return loc&&/^https?:$/.test(loc.protocol)?`${loc.origin}${loc.pathname}`:'';
    }
    redirectQuery() {const url=this.returnUrl();return url?`?redirect_to=${encodeURIComponent(url)}`:'';}
    async authRequest(path,body) {
      if(!this.db.config.configured)throw new Error('Login needs the database connection. Refresh and try again.');
      const response=await this.db.request(this.authUrl(path),{method:'POST',headers:this.db.headers({'Content-Type':'application/json'}),body:JSON.stringify(body)});
      let result={};try{result=await response.json()}catch{}
      if(!response.ok){const error=new Error(this.friendly(response.status,result));error.code=result.error_code||result.code||'';throw error;}
      return result;
    }
    friendly(status,result) {
      const code=result.error_code||result.code,msg=String(result.msg||result.error_description||result.message||'');
      if(code==='invalid_credentials'||/invalid login credentials/i.test(msg))return 'That email and password do not match an account.';
      if(code==='email_not_confirmed'||/not confirmed/i.test(msg))return 'Confirm your email first: open the link we sent, then log in.';
      if(code==='user_already_exists'||/already (registered|exists)/i.test(msg))return 'An account with that email already exists. Try logging in.';
      if(code==='weak_password'||(status===422&&/password/i.test(msg)))return 'Choose a stronger password (at least 8 characters).';
      if(code==='over_email_send_rate_limit')return 'Too many emails were sent recently. If you already signed up, check your inbox and spam for the confirmation link and log in. Otherwise try again in a little while.';
      if(code==='over_request_rate_limit'||status===429)return 'Too many attempts. Wait a minute and try again.';
      if(code==='validation_failed'||/valid email|email address/i.test(msg))return 'Enter a valid email address.';
      if(status>=500)return 'The server had a problem with that request. Try again in a minute, and tell the team if it keeps happening.';
      return 'Could not complete that request. Check your details and try again.';
    }
    // Look up the linked User row. RLS only returns the signed-in user's own row.
    async loadProfile() {
      const query=new URLSearchParams({select:'user_id,first_name,last_name',limit:'1'});
      const response=await this.db.request(`${this.db.config.url}/rest/v1/User?${query}`,{headers:this.db.headers()});
      if(!response.ok)throw new Error('Signed in, but your profile could not be loaded. Try again.');
      const rows=await response.json();
      if(!Array.isArray(rows)||rows.length!==1||!Number.isSafeInteger(Number(rows[0].user_id)))throw new Error('Signed in, but no profile is linked to this account yet.');
      this.profile={...rows[0],user_id:Number(rows[0].user_id)};
      this.db.userId=this.profile.user_id;
    }
    async finish(session) {
      this.setSession(this.normalize(session));
      try{await this.loadProfile()}catch(error){this.setSession(null);this.db.userId=null;throw error}
      this.emit();return this.profile;
    }
    // Create the account; Supabase creates the matching User row. Returns {needsConfirmation}.
    async signUp({email,password,firstName,lastName}) {
      const result=await this.authRequest(`signup${this.redirectQuery()}`,{email,password,data:{first_name:firstName,last_name:lastName}});
      if(result.access_token){await this.finish(result);return {needsConfirmation:false};}
      return {needsConfirmation:true};
    }
    // Send the confirmation email again (for example when it never arrived).
    async resendConfirmation(email) {
      await this.authRequest(`resend${this.redirectQuery()}`,{type:'signup',email});
    }
    async signIn({email,password}) {
      const result=await this.authRequest('token?grant_type=password',{email,password});
      return this.finish(result);
    }
    async signOut() {
      const token=this.session?.access_token;
      // An admin's dev-page unlock would otherwise last up to two hours after logging out here.
      if(token&&this.isAdmin&&this.db.config.configured){
        try{await this.db.request(`${this.db.config.url}/rest/v1/rpc/lock_admin`,{method:'POST',headers:this.db.headers({Authorization:`Bearer ${token}`,'Content-Type':'application/json'}),body:'{}'})}catch{}
        try{for(const name of ['nook_admin_at','nook_admin_rt'])scope.document.cookie=`${name}=; Path=/; Max-Age=0; SameSite=Lax`}catch{}
      }
      try{if(token&&this.db.config.configured)await this.db.request(this.authUrl('logout'),{method:'POST',headers:this.db.headers({Authorization:`Bearer ${token}`})});}catch{}
      this.setSession(null);this.db.userId=null;this.emit();
    }
    // Restore a saved session on page load, refreshing it when it has expired.
    // The emailed confirmation link returns here with the new session (or an error) in the URL hash.
    // Take it, then clear the hash so tokens are not left in the address bar or browser history.
    takeRedirectHash() {
      const loc=scope.location,hash=loc?.hash||'';
      if(!/access_token=|error=|error_code=/.test(hash))return null;
      const params=new URLSearchParams(hash.replace(/^#/,''));
      try{scope.history?.replaceState(null,'',`${loc.pathname}${loc.search}`)}catch{}
      if(params.get('access_token')&&params.get('refresh_token'))return {session:{access_token:params.get('access_token'),refresh_token:params.get('refresh_token'),expires_in:Number(params.get('expires_in'))||3600}};
      const code=params.get('error_code')||params.get('error')||'';
      return {error:code==='otp_expired'?'That confirmation link has expired. Log in and choose "Resend confirmation email".':'The confirmation link did not work. Log in and choose "Resend confirmation email".'};
    }
    async restore() {
      this.notice='';
      const redirected=this.db.config.configured?this.takeRedirectHash():null;
      if(redirected?.error)this.notice=redirected.error;
      if(redirected?.session){
        try{await this.finish(redirected.session);this.notice='Email confirmed. Welcome!';return true;}
        catch{this.setSession(null);this.db.userId=null;this.notice='Your email is confirmed. Please log in.';}
      }
      let saved=null;try{saved=JSON.parse(this.storage?.getItem(SESSION_KEY)||'null')}catch{}
      if(!saved?.access_token||!this.db.config.configured)return false;
      try{
        if(!saved.expires_at||saved.expires_at*1000<Date.now()+30000){
          if(!saved.refresh_token)throw new Error('expired');
          saved=await this.authRequest('token?grant_type=refresh_token',{refresh_token:saved.refresh_token});
        }
        await this.finish(saved);return true;
      } catch{this.setSession(null);this.db.userId=null;this.emit();return false;}
    }
  }
  scope.StudyAuth=StudyAuth;
})(typeof window==='undefined'?globalThis:window);
