import {createServer} from 'node:http';
import {networkInterfaces} from 'node:os';
import {once} from 'node:events';

function lanAddress() {
  const lan = /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/;
  const interfaces = Object.entries(networkInterfaces())
    .filter(([name]) => /^(?:en|eth|wl)/.test(name))
    .sort(([a], [b]) => a.localeCompare(b));
  return interfaces.flatMap(([, addresses]) => addresses)
    .find(ip => ip.family === 'IPv4' && !ip.internal && lan.test(ip.address))?.address;
}

export function phoneView(port, handleRequest) {
  let server, change = Promise.resolve(), url = '';
  async function setEnabled(enabled) {
    if (enabled === Boolean(server)) return;
    if (!enabled) {
      const closed = once(server, 'close');
      server.close();
      server.closeAllConnections();
      await closed;
      server = null;
      url = '';
      return;
    }
    const address = lanAddress();
    if (!address) throw Error('Mac’i telefonla aynı Wi-Fi ağına bağlayıp tekrar dene.');
    const candidate = createServer(handleRequest);
    const ready = once(candidate, 'listening');
    candidate.listen(port, address);
    try { await ready; }
    catch { throw Error('Telefon için oyun adresi açılamadı. Wi-Fi bağlantısını ve stüdyo portunu kontrol et.'); }
    server = candidate;
    url = 'http://' + address + ':' + port + '/overlay';
  }
  return {
    get url() { return url; },
    setEnabled(enabled) {
      const pending = change.then(() => setEnabled(enabled));
      change = pending.catch(() => {});
      return pending;
    }
  };
}
