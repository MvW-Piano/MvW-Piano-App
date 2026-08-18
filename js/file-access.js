// Optioneel: onthoudt de samples-map via de File System Access API
// (alleen Chrome/Edge) zodat je 'm niet elke sessie opnieuw hoeft door te
// bladeren — na de eerste keer volstaat een korte "toegang toestaan?"-
// bevestiging (queryPermission/requestPermission), of zelfs helemaal geen
// klik als die toestemming nog geldig is (zie App.tryAutoLoadSamples).
// Browsers zonder ondersteuning (Firefox/Safari) vallen automatisch terug
// op de klassieke bestandenkiezer (#global-sample-upload, webkitdirectory)
// — zie App.pickSamplesFolder(). De maphandle zelf kan niet in
// localStorage (niet JSON-serialiseerbaar); IndexedDB ondersteunt dit wél
// via de structured-clone-algoritme.
const FileAccess = {
  DB_NAME: 'pm_filesystem', STORE: 'handles', KEY: 'sampleDir',
  supported(){ return typeof window.showDirectoryPicker === 'function'; },
  openDB(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(this.STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async getSavedHandle(){
    try {
      const db = await this.openDB();
      return await new Promise((resolve) => {
        const req = db.transaction(this.STORE, 'readonly').objectStore(this.STORE).get(this.KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch(e){ return null; }
  },
  async saveHandle(handle){
    try {
      const db = await this.openDB();
      await new Promise((resolve) => {
        const tx = db.transaction(this.STORE, 'readwrite');
        tx.objectStore(this.STORE).put(handle, this.KEY);
        tx.oncomplete = resolve; tx.onerror = resolve;
      });
    } catch(e){ /* opslaan mislukt: volgende keer wordt gewoon opnieuw gevraagd */ }
  },
  async collectFiles(dirHandle){
    const files = [];
    for await (const entry of dirHandle.values()){
      if (entry.kind === 'file' && /\.(wav|mp3)$/i.test(entry.name)) files.push(await entry.getFile());
    }
    return files;
  }
};
