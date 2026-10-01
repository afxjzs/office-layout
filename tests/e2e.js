// E2E test, run inside the page by tests/run-e2e.sh. Reports via window.__e2e.
(async () => {
  const results = [];
  let pass = true;
  const check = (name, ok, detail = '') => {
    results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' (' + detail + ')' : ''}`);
    if (!ok) pass = false;
  };
  const finish = () => { window.__e2e = results.join('\n') + '\n' + (pass ? 'ALL PASS' : 'FAILED'); };
  try {
    const o = window.__office;
    const svg = document.getElementById('plan');
    const wait = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    // Room (plan) coordinates → screen pixels, through the plan's current orientation.
    const toClient = (x, y) => {
      const [vx, vy] = o.view ? o.view(x, y) : [x, y];
      const p = svg.createSVGPoint(); p.x = vx; p.y = vy; return p.matrixTransform(svg.getScreenCTM());
    };
    const screenBox = id => document.querySelector(`[data-id="${id}"] polygon`)?.getBoundingClientRect();
    const fire = (type, el, x, y, extra = {}) => {
      const c = toClient(x, y);
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: c.x, clientY: c.y, pointerId: 1, ...extra }));
    };

    // --- The three glass display cases are seeded into the layout, once ---
    const cases = {
      'case-sideboard': [55.1, 15.7, 29.5, false],
      'case-low':       [59, 13.8, 23.6, true],
      'case-curio':     [19.69, 15.75, 70.87, true],
    };
    for (const [id, [w, d, h, hidden]] of Object.entries(cases)) {
      const found = o.items.filter(i => i.id === id);
      check(`${id} is in the layout exactly once`, found.length === 1, String(found.length));
      if (found.length !== 1) continue;
      const c = found[0];
      check(`${id} is ${w}×${d}×${h}`, c.w === w && c.d === d && c.h === h, `${c.w}×${c.d}×${c.h}`);
      check(`${id} starts ${hidden ? 'hidden' : 'shown'}`, !!c.hidden === hidden);
    }
    for (const id of ['case-low', 'case-curio']) {
      const cbx = document.querySelector(`[data-toggle="${id}"]`);
      if (!cbx) { check(`${id} has a show/hide toggle`, false); continue; }
      cbx.click(); await wait();
      const m = o.furniture3D().find(m => m.id === id);
      check(`${id} builds a 3D model with glass and shelves when shown`, !!m && m.meshes >= 8, m ? `${m.meshes} meshes` : 'none');
      document.querySelector(`[data-toggle="${id}"]`).click(); await wait();
      check(`${id} hides again`, o.items.find(i => i.id === id).hidden === true);
    }
    for (const label of ['Low glass case', 'Glass curio'])
      check(`palette has ${label}`, [...document.querySelectorAll('#palette button')].some(b => b.textContent === label));

    // --- Storage pieces: seeded once, hidden, each with a 3D model ---
    const storage = {
      'store-cart':      [19.25, 16, 26.25, 'Drawer cart'],
      'store-chest':     [21.26, 17.71, 51.18, 'Drawer chest'],
      'store-bookcase':  [31.5, 15.75, 70.87, 'Bookcase + cabinet'],
      'store-filehutch': [19.7, 15.7, 65, 'File cabinet + hutch'],
    };
    for (const [id, [w, d, h, label]] of Object.entries(storage)) {
      const found = o.items.filter(i => i.id === id);
      check(`${id} is in the layout exactly once`, found.length === 1, String(found.length));
      check(`palette has ${label}`, [...document.querySelectorAll('#palette button')].some(b => b.textContent === label));
      if (found.length !== 1) continue;
      const c = found[0];
      check(`${id} is ${w}×${d}×${h}`, c.w === w && c.d === d && c.h === h, `${c.w}×${c.d}×${c.h}`);
      check(`${id} starts hidden`, c.hidden === true);
      const cbx = document.querySelector(`[data-toggle="${id}"]`);
      if (!cbx) { check(`${id} has a show/hide toggle`, false); continue; }
      cbx.click(); await wait();
      const m = o.furniture3D().find(m => m.id === id);
      check(`${id} builds a 3D model when shown`, !!m && m.meshes >= 10, m ? `${m.meshes} meshes` : 'none');
      if (id === 'store-bookcase') {
        const pts = document.querySelector(`[data-id="${id}"] polygon`)?.points.length ?? 0;
        check('bookcase footprint has rounded front corners', pts > 8, `${pts} points`);
      }
      if (id === 'store-filehutch') {
        // A small box 40″ up: free in front of the 7.9″-deep hutch, blocked where the hutch is.
        const fh = o.items.find(i => i.id === id);
        [...document.querySelectorAll('#palette button')].find(b => b.textContent === 'Custom box').click(); await wait();
        const probe = o.items[o.items.length - 1];
        Object.assign(probe, { name:'E2E probe', w:6, d:3, h:4, z:40, rot:0 });
        probe.x = fh.x; probe.y = fh.y + fh.d/2 - 2;            // front 3″ of the footprint, above the file base
        document.querySelector(`#itemList [data-id="${probe.id}"]`).click(); await wait();
        check('space in front of the hutch is free', !o.problems.probs.some(p => p.includes('E2E probe')), JSON.stringify(o.problems.probs));
        probe.y = fh.y - fh.d/2 + 2;                             // back 3″, inside the hutch
        document.querySelector(`#itemList [data-id="${probe.id}"]`).click(); await wait();
        check('the hutch itself blocks it', o.problems.probs.some(p => p.includes('E2E probe') && p.includes('File cabinet')), JSON.stringify(o.problems.probs));
        document.getElementById('bDel').click(); await wait();
      }
      document.querySelector(`[data-toggle="${id}"]`).click(); await wait();
      check(`${id} hides again`, o.items.find(i => i.id === id).hidden === true);
    }

    // --- Existing 3-drawer file cabinet: shown, in front of the heater, drawers facing the room ---
    {
      const found = o.items.filter(i => i.id === 'filecab-sticker');
      check('3-drawer file cabinet is in the layout exactly once', found.length === 1, String(found.length));
      if (found.length === 1) {
        const c = found[0];
        check('3-drawer file cabinet is 14.5 W × 19 D × 28 H', c.w === 14.5 && c.d === 19 && c.h === 28, `${c.w}×${c.d}×${c.h}`);
        check('3-drawer file cabinet is shown', !c.hidden);
        check('3-drawer file cabinet has 3 drawers', c.drawers === 3, String(c.drawers));
        check('3-drawer file cabinet faces the room (180°)', c.rot === 180, String(c.rot));
        const b = { x0: c.x - c.w/2, x1: c.x + c.w/2, y1: c.y + c.d/2 };
        const heater = o.FIXTURES.find(f => f.part === 'heater').poly;
        const hx0 = Math.min(...heater.map(p => p[0])), hx1 = Math.max(...heater.map(p => p[0])), hy0 = Math.min(...heater.map(p => p[1]));
        check('3-drawer file cabinet backs onto the heater front', Math.abs(b.y1 - hy0) < 0.01 && b.x1 > hx0 && b.x0 < hx1, `back ${b.y1}, heater front ${hy0}`);
        check('3-drawer file cabinet has no conflicts', !o.problems.probs.some(p => p.includes(c.name)), JSON.stringify(o.problems.probs));
        const m = o.furniture3D().find(m => m.id === c.id);
        check('3-drawer file cabinet has a 3D model', !!m && m.meshes >= 7, m ? `${m.meshes} meshes` : 'none');
      }
    }

    // --- Cambrie cabinet and farmhouse filing cabinet: seeded once, hidden ---
    const cabinets = {
      'cab-cambrie':   [31, 16, 26, 'Cambrie cabinet'],
      'cab-farmhouse': [31.5, 20, 29.5, 'Farmhouse filing cabinet'],
    };
    for (const [id, [w, d, h, label]] of Object.entries(cabinets)) {
      const found = o.items.filter(i => i.id === id);
      check(`${id} is in the layout exactly once`, found.length === 1, String(found.length));
      check(`palette has ${label}`, [...document.querySelectorAll('#palette button')].some(b => b.textContent === label));
      if (found.length !== 1) continue;
      const c = found[0];
      check(`${id} is ${w}×${d}×${h}`, c.w === w && c.d === d && c.h === h, `${c.w}×${c.d}×${c.h}`);
      check(`${id} starts hidden`, c.hidden === true);
      document.querySelector(`[data-toggle="${id}"]`).click(); await wait();
      const m = o.furniture3D().find(m => m.id === id);
      check(`${id} builds a 3D model when shown`, !!m && m.meshes >= 12, m ? `${m.meshes} meshes` : 'none');
      document.querySelector(`[data-toggle="${id}"]`).click(); await wait();
      check(`${id} hides again`, o.items.find(i => i.id === id).hidden === true);
    }

    // --- Prices, links and the budget ---
    {
      const low = o.items.find(i => i.id === 'case-low'), fh = o.items.find(i => i.id === 'store-filehutch');
      check('low glass case links to its Wayfair page', !!low?.url?.includes('w117240010'), low?.url);
      check('low glass case price is $199.99', low?.price === 199.99, String(low?.price));
      check('file cabinet + hutch links to its Wayfair page', !!fh?.url?.includes('w122272656'), fh?.url);
      check('file cabinet + hutch price is $155.99', fh?.price === 155.99, String(fh?.price));
      for (const id of ['futon', 'filecab-sticker'])
        check(`${id} is marked as already owned`, o.items.find(i => i.id === id)?.owned === true);

      // Every linked piece: its Wayfair page and the price read on Sep 30, 2026
      const expected = {
        'case-sideboard': ['w113174017', 246.99], 'case-curio': ['w114438607', 169.99], 'case-low': ['w117240010', 199.99],
        'store-cart': ['w114483533', 129.99], 'store-chest': ['w110213173', 184.99], 'store-bookcase': ['w112629011', 169.99],
        'store-filehutch': ['w122272656', 155.99], 'cab-farmhouse': ['w008012808', 169.99],
        'shelf-shaker': ['w113145562', 293.99], 'shelf-arc': ['w100028259', 179.99], 'cab-arched': ['w113272212', 202.99],
      };
      for (const [id, [sku, price]] of Object.entries(expected)) {
        const it = o.items.find(i => i.id === id);
        check(`${id} links to Wayfair ${sku} at $${price}`, !!it?.url?.includes(sku) && it.price === price, `${it?.url} $${it?.price}`);
      }
      // A layout still holding the screenshot price for the Shaker bookcase gets today's price and link
      const saved = JSON.parse(localStorage.getItem('office-layout.v1'));
      const shot = saved.layouts.Screenshot?.find(i => i.id === 'shelf-shaker');
      check('screenshot price for the Shaker bookcase is replaced with today\'s', shot?.price === 293.99 && !!shot?.url?.includes('w113145562'), JSON.stringify(shot && { price: shot.price, url: shot.url }));

      const budget = () => document.getElementById('budget')?.innerText ?? '';
      check('budget panel exists', !!document.getElementById('budget'));
      check('budget starts with the shown glass cabinet ($246.99)', budget().includes('$246.99'), budget());
      check('budget leaves owned pieces out', !budget().includes('Futon'), budget());
      [...document.querySelectorAll('#palette button')].find(b => b.textContent === 'Custom box').click(); await wait();
      const unpriced = o.items[o.items.length - 1];
      check('budget lists shown pieces with no price', /No price yet[^]*Item/.test(budget()), budget());
      document.querySelector(`#itemList [data-id="${unpriced.id}"]`).click(); await wait();
      document.getElementById('bDel').click(); await wait();

      document.querySelector('[data-toggle="case-low"]').click(); await wait();
      check('showing the low glass case adds $199.99 ($446.98)', budget().includes('$446.98'), budget());
      document.querySelector('[data-toggle="store-filehutch"]').click(); await wait();
      check('showing the file cabinet too totals $602.97', budget().includes('$602.97'), budget());

      // edit a price through the sidebar form
      document.querySelector('#itemList [data-id="case-low"]').click(); await wait();
      const priceIn = document.querySelector('[data-k="price"]');
      check('selected piece has a price field', !!priceIn && priceIn.value === '199.99', priceIn?.value);
      const link = document.querySelector('#formHost a[target="_blank"]');
      check('selected piece shows a link that opens in a new tab', !!link && link.href.includes('w117240010'));
      priceIn.value = '-5'; priceIn.dispatchEvent(new Event('change')); await wait();
      check('negative price is rejected', o.items.find(i => i.id === 'case-low').price === 199.99 && /price/i.test(document.getElementById('formErr').textContent), document.getElementById('formErr').textContent);
      const p2 = document.querySelector('[data-k="price"]');
      p2.value = '150'; p2.dispatchEvent(new Event('change')); await wait();
      check('changing the price updates the total ($552.98)', budget().includes('$552.98'), budget());
      const urlIn = document.querySelector('[data-k="url"]');
      urlIn.value = 'not a link'; urlIn.dispatchEvent(new Event('change')); await wait();
      check('a link that is not http(s) is rejected', o.items.find(i => i.id === 'case-low').url.includes('w117240010') && /link/i.test(document.getElementById('formErr').textContent), document.getElementById('formErr').textContent);

      // put things back: undo the price edit, hide both again
      document.getElementById('undo').click(); await wait();
      check('undo restores the price', o.items.find(i => i.id === 'case-low').price === 199.99);
      document.querySelector('[data-toggle="case-low"]').click(); await wait();
      document.querySelector('[data-toggle="store-filehutch"]').click(); await wait();
    }

    // --- Bamboo etagere, black cube bookcase, corner floor lamp: seeded once, hidden, priced ---
    const lateAdds = {
      'shelf-bamboo': [38.6, 9.8, 68.9, 'Bamboo etagere', 'mnib1417', 104.99],
      'shelf-cubes':  [35.04, 9.3, 71.3, 'Cube bookcase', 'w110262558', 116.99],
      'lamp-corner':  [11.8, 11.8, 64, 'Corner floor lamp', 'w110528988', 87.99],
      'chest-trunk':  [47.8, 15.75, 17.8, 'Storage chest', 'w119652396', 183.99],
      'shelf-cubby':  [35.43, 11.81, 23.62, 'Cubby bookcase', 'w119556093', 129.99],
    };
    for (const [id, [w, d, h, label, sku, price]] of Object.entries(lateAdds)) {
      const found = o.items.filter(i => i.id === id);
      check(`${id} is in the layout exactly once`, found.length === 1, String(found.length));
      check(`palette has ${label}`, [...document.querySelectorAll('#palette button')].some(b => b.textContent === label));
      if (found.length !== 1) continue;
      const c = found[0];
      check(`${id} is ${w}×${d}×${h}`, c.w === w && c.d === d && c.h === h, `${c.w}×${c.d}×${c.h}`);
      check(`${id} starts hidden`, c.hidden === true);
      check(`${id} links to Wayfair ${sku} at $${price}`, !!c.url?.toLowerCase().includes(sku) && c.price === price, `${c.url} $${c.price}`);
      document.querySelector(`[data-toggle="${id}"]`).click(); await wait();
      const m = o.furniture3D().find(m => m.id === id);
      check(`${id} builds a 3D model when shown`, !!m && m.meshes >= 8, m ? `${m.meshes} meshes` : 'none');
      check(`${id} sits in a clear spot when shown`, !o.problems.probs.some(p => p.includes(c.name)), JSON.stringify(o.problems.probs));
      if (id === 'lamp-corner') {
        const pts = document.querySelector(`[data-id="${id}"] polygon`)?.points.length ?? 0;
        check('corner lamp footprint is a five-sided corner shape', pts === 5, `${pts} points`);
        const xs = [...document.querySelector(`[data-id="${id}"] polygon`).points].length;
        check('corner lamp is parked in the northwest corner', Math.abs(c.x - c.w/2) < 0.01 && Math.abs(c.y - c.d/2) < 0.01, `${c.x},${c.y}`);
      }
      if (id === 'shelf-cubes') {
        const [r, g, b] = [1, 3, 5].map(k => parseInt(c.color.slice(k, k + 2), 16));
        check('cube bookcase is black', r < 60 && g < 60 && b < 60, c.color);
      }
      document.querySelector(`[data-toggle="${id}"]`).click(); await wait();
      check(`${id} hides again`, o.items.find(i => i.id === id).hidden === true);
    }

    // --- Hosted with a site bar on top (doug.is injects a nav as the first <body> child) ---
    {
      check('page has a meta description (used for the doug.is card)', !!document.querySelector('meta[name="description"]')?.content);
      const fits = () => {
        const hdr = document.querySelector('header').getBoundingClientRect();
        const plan = document.getElementById('planWrap').getBoundingClientRect();
        const three = document.getElementById('three').getBoundingClientRect();
        return { hdrTop: hdr.top, hdrH: hdr.height, planTop: plan.top, planH: plan.height, threeH: three.height, threeBottom: three.bottom, vh: window.innerHeight };
      };
      const bar = document.createElement('nav');
      bar.style.cssText = 'height:44px;flex:none;background:#ccc';
      document.body.prepend(bar);
      window.dispatchEvent(new Event('resize')); await wait();
      const f = fits();
      check('with a site bar on top: toolbar sits below the bar', f.hdrTop >= 43, JSON.stringify(f));
      check('with a site bar on top: toolbar is not stretched and the plan starts right under it', f.hdrH < 90 && f.planTop - (f.hdrTop + f.hdrH) < 2, JSON.stringify(f));
      check('with a site bar on top: plan and 3D both keep real height', f.planH > 120 && f.threeH > 120, JSON.stringify(f));
      check('with a site bar on top: 3D view still ends inside the window', f.threeBottom <= f.vh + 1, JSON.stringify(f));
      bar.remove();
      window.dispatchEvent(new Event('resize')); await wait();
      const g = fits();
      check('without the bar: the page fills the window again', g.hdrTop < 1 && g.threeBottom <= g.vh + 1 && g.threeBottom > g.vh - 2, JSON.stringify(g));
    }

    // --- Cambrie cabinet price ---
    {
      const cam = o.items.find(i => i.id === 'cab-cambrie');
      check('Cambrie cabinet links to Wayfair w005165895 at $83.99', !!cam?.url?.includes('w005165895') && cam.price === 83.99, `${cam?.url} $${cam?.price}`);
    }

    // --- Plan orientation: north faces down by default (the view from the desk) ---
    {
      const flipBtn = document.getElementById('flipPlan');
      check('plan has a north up/down button', !!flipBtn);
      check('plan starts with north down', !!o.view && o.northDown === true && /north.*down/i.test(flipBtn?.textContent || ''), flipBtn?.textContent);
      // futon is on the north wall (west end); the glass cabinet is on the south wall; the file cabinet is east of the futon
      const fut = screenBox('futon'), cab = screenBox('case-sideboard'), fc = screenBox('filecab-sticker');
      check('north down: south-wall glass cabinet is drawn above the north-wall futon', !!fut && !!cab && cab.top < fut.top, `cabinet top ${cab?.top}, futon top ${fut?.top}`);
      check('north down: the file cabinet (east of the futon) is drawn to its left', !!fut && !!fc && fc.left < fut.left, `file cab left ${fc?.left}, futon left ${fut?.left}`);
      const labels = [...svg.querySelectorAll('text')].filter(t => /rotate\(180/.test(t.getAttribute('transform') || '') || /rotate\(180/.test(t.closest('g')?.getAttribute('transform') || ''));
      check('labels stay upright', labels.length === 0, `${labels.length} upside-down labels`);

      // dragging follows the pointer on screen: pointer moves right → piece moves right on screen (west in the room)
      const c = o.items.find(i => i.id === 'case-sideboard'), x0 = c.x;
      const poly = document.querySelector('[data-id="case-sideboard"] polygon');
      const start = toClient(c.x, c.y);
      poly.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: start.x, clientY: start.y, pointerId: 1 }));
      svg.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: start.x + 30, clientY: start.y, pointerId: 1, altKey: true }));
      await wait();
      svg.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: start.x + 30, clientY: start.y, pointerId: 1 }));
      await wait();
      check('north down: dragging right on screen moves the piece west', c.x < x0 - 1, `x ${x0} -> ${c.x}`);
      document.getElementById('undo').click(); await wait();
      // arrow keys follow the screen too: ArrowUp moves toward the top of the plan (south)
      document.querySelector('#itemList [data-id="case-sideboard"]').click(); await wait();
      document.activeElement?.blur();
      const y0 = o.items.find(i => i.id === 'case-sideboard').y;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' })); await wait();
      check('north down: the up arrow moves the piece south (up on screen)', o.items.find(i => i.id === 'case-sideboard').y === y0 + 0.5, `y ${y0} -> ${o.items.find(i => i.id === 'case-sideboard').y}`);
      document.getElementById('undo').click(); await wait();

      // flip to north up and back
      flipBtn.click(); await wait();
      const fut2 = screenBox('futon'), cab2 = screenBox('case-sideboard');
      check('flip button switches to north up', o.northDown === false && /north.*up/i.test(document.getElementById('flipPlan').textContent) && cab2.top > fut2.top, document.getElementById('flipPlan').textContent);
      document.getElementById('flipPlan').click(); await wait();
      check('flip button switches back to north down', o.northDown === true);
    }

    // --- Printer table: measured 23.5 W × 17.5 D and position (height still estimated) ---
    {
      const pt = o.items.find(i => i.id === 'printer');
      check('printer table is the measured 23.5 × 17.5', pt?.w === 23.5 && pt?.d === 17.5, `${pt?.w}×${pt?.d}`);
      check('printer table still backs onto the south wall', !!pt && Math.abs(pt.y + pt.d/2 - 94) < 0.01, pt && String(pt.y + pt.d/2));
      check('printer table stays marked as an estimate (height)', pt?.est === true);
      // The "What's measured vs. assumed" panel once still called the printer table's size and position estimates.
      const notes = [...document.querySelectorAll('details')].find(d => /measured vs\. assumed/.test(d.querySelector('summary')?.textContent || ''));
      const lines = notes ? [...notes.querySelectorAll('li')].map(li => li.textContent) : [];
      const measured = lines.find(t => t.startsWith('Measured by you')) || '', estimated = lines.filter(t => t.startsWith('Estimated')).join(' ');
      check('notes panel lists the printer table and file cabinet as measured', /printer table/i.test(measured) && /file cabinet/i.test(measured), measured);
      check('notes panel lists only the printer table height as estimated', /printer table height/i.test(estimated) && !/printer table (size|and|position)/i.test(estimated), estimated);
      check('no overlap warning between the glass cabinet and the printer table', !o.problems.probs.some(p => p.includes('Printer table')), JSON.stringify(o.problems.probs));
      const saved = JSON.parse(localStorage.getItem('office-layout.v1'));
      const edited = saved.layouts.Screenshot?.find(i => i.id === 'printer');
      check('a printer table the user already resized is left alone', edited?.w === 20 && edited?.d === 16, JSON.stringify(edited && { w: edited.w, d: edited.d }));

      // Confirmed positions (Oct 1, 2026): printer table's east side against the heater's west side;
      // file cabinet against the desk's west end, backed onto the heater front.
      const heater = o.FIXTURES.find(f => f.part === 'heater').poly;
      const hx0 = Math.min(...heater.map(p => p[0])), hx1 = Math.max(...heater.map(p => p[0])), hy0 = Math.min(...heater.map(p => p[1]));
      check('printer table sits against the west side of the heater', !!pt && Math.abs(pt.x + pt.w/2 - hx0) < 0.01, pt && `east edge ${pt.x + pt.w/2}, heater west ${hx0}`);
      const fc = o.items.find(i => i.id === 'filecab-sticker');
      check('file cabinet sits against the desk\'s west end (heater east edge)', !!fc && Math.abs(fc.x + fc.w/2 - hx1) < 0.01, fc && `east edge ${fc.x + fc.w/2}, heater east ${hx1}`);
      check('file cabinet stays backed onto the heater front', !!fc && Math.abs(fc.y + fc.d/2 - hy0) < 0.01, fc && String(fc.y + fc.d/2));
      check('file cabinet position is no longer marked as an estimate', fc?.est === false);
      check('placed file cabinet and printer table cause no warnings', !o.problems.probs.some(p => /Printer table|file cabinet/i.test(p)), JSON.stringify(o.problems.probs));
      // a piece the user moved somewhere else on purpose stays put
      const movedPt = saved.layouts.Screenshot?.find(i => i.id === 'printer');
      check('a printer table the user moved elsewhere stays put', movedPt?.x === 30, movedPt && String(movedPt.x));
    }

    // --- Rounded bookcase: deeper cabinet, shallower shelves ---
    {
      const bc = o.items.find(i => i.id === 'store-bookcase');
      check('bookcase cabinet is 15.75″ deep', bc && bc.d === 15.75, bc && String(bc.d));
      check('bookcase shelves are 11.81″ deep', bc && bc.upperD === 11.81, bc && String(bc.upperD));
    }

    // --- Shaker bookcase, arc etagere, arched cabinet: seeded once, hidden ---
    const shelves = {
      'shelf-shaker': [30, 13.25, 72, 'Shaker bookcase'],
      'shelf-arc':    [31.5, 11.8, 70.5, 'Arc etagere'],
      'cab-arched':   [31.5, 15.7, 69.3, 'Arched cabinet'],
    };
    for (const [id, [w, d, h, label]] of Object.entries(shelves)) {
      const found = o.items.filter(i => i.id === id);
      check(`${id} is in the layout exactly once`, found.length === 1, String(found.length));
      check(`palette has ${label}`, [...document.querySelectorAll('#palette button')].some(b => b.textContent === label));
      if (found.length !== 1) continue;
      const c = found[0];
      check(`${id} is ${w}×${d}×${h}`, c.w === w && c.d === d && c.h === h, `${c.w}×${c.d}×${c.h}`);
      check(`${id} starts hidden`, c.hidden === true);
      document.querySelector(`[data-toggle="${id}"]`).click(); await wait();
      const m = o.furniture3D().find(m => m.id === id);
      check(`${id} builds a 3D model when shown`, !!m && m.meshes >= 10, m ? `${m.meshes} meshes` : 'none');
      check(`${id} sits in a clear spot when shown`, !o.problems.probs.some(p => p.includes(c.name)), JSON.stringify(o.problems.probs));
      document.querySelector(`[data-toggle="${id}"]`).click(); await wait();
      check(`${id} hides again`, o.items.find(i => i.id === id).hidden === true);
    }

    // --- Glass cabinet (55.1 × 15.7 × 29.5, on 3.9″ legs) ---
    const btn = [...document.querySelectorAll('#palette button')].find(b => /glass cabinet/i.test(b.textContent));
    check('palette has a Glass cabinet button', !!btn);
    if (!btn) return finish();

    const before = o.items.length;
    btn.click(); await wait();
    const it = o.items[o.items.length - 1];
    it.name = 'E2E cabinet'; // unique name so problem messages can't be confused with the seeded case
    check('clicking adds one item', o.items.length === before + 1, `${before} -> ${o.items.length}`);
    check('kind is glasscab', it.kind === 'glasscab', it.kind);
    check('size is 55.1 × 15.7 × 29.5', it.w === 55.1 && it.d === 15.7 && it.h === 29.5, `${it.w}×${it.d}×${it.h}`);
    check('legs are 3.9″', it.legH === 3.9, String(it.legH));

    const poly = document.querySelector(`[data-id="${it.id}"] polygon`);
    check('drawn in the plan', !!poly);
    if (poly) {
      const x0 = it.x, y0 = it.y;
      fire('pointerdown', poly, x0, y0);
      fire('pointermove', svg, x0 + 20, y0 - 10, { altKey: true });
      await wait();
      fire('pointerup', svg, x0 + 20, y0 - 10);
      await wait();
      check('moves when dragged', Math.abs(it.x - (x0 + 20)) < 0.01 && Math.abs(it.y - (y0 - 10)) < 0.01, `${x0},${y0} -> ${it.x},${it.y}`);
    }

    const model = o.furniture3D().find(m => m.id === it.id);
    check('has a 3D model', !!model);
    check('3D model has frame, glass and shelf parts', !!model && model.meshes >= 12, model ? `${model.meshes} meshes` : 'none');

    const store = JSON.parse(localStorage.getItem('office-layout.v1'));
    const saved = store.layouts[store.current].find(s => s.id === it.id);
    check('autosaved with its new position', !!saved && saved.x === it.x && saved.y === it.y);

    // --- Rotate ---
    document.activeElement?.blur();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' })); await wait();
    check('R key rotates the selected piece 90°', it.rot === 90, String(it.rot));
    document.getElementById('bRot').click(); await wait();
    const rotated = o.items.find(i => i.id === it.id);
    check('Rotate 90° button rotates again', rotated.rot === 180, String(rotated.rot));

    // --- Toggle visibility ---
    const cb = document.querySelector(`[data-toggle="${it.id}"]`);
    check('item list has a show/hide checkbox', !!cb && cb.checked);
    if (cb) {
      cb.click(); await wait();
      const hid = o.items.find(i => i.id === it.id);
      check('hidden flag set', hid.hidden === true);
      check('hidden piece is gone from the plan', !document.querySelector(`[data-id="${it.id}"] polygon`));
      check('hidden piece is gone from 3D', !o.furniture3D().some(m => m.id === it.id));
      check('hidden piece keeps its position', hid.x === rotated.x && hid.y === rotated.y && hid.rot === 180);
      // park it on the futon: hidden, so no conflict should be reported
      const futon = o.items.find(i => i.kind === 'futon');
      hid.x = futon.x; hid.y = futon.y;
      document.getElementById('undo'); // no-op; force a recompute via select
      document.querySelector(`#itemList [data-id="${it.id}"]`).click(); await wait();
      check('hidden piece is skipped by collision checks', !o.problems.probs.some(p => p.includes('E2E cabinet')), JSON.stringify(o.problems.probs));
      document.querySelector(`[data-toggle="${it.id}"]`).click(); await wait();
      check('showing it again brings it back in the plan', !!document.querySelector(`[data-id="${it.id}"] polygon`));
      check('showing it again brings back its conflicts', o.problems.probs.some(p => p.includes('E2E cabinet')), JSON.stringify(o.problems.probs));
    }

    // clean up: select and remove it
    document.querySelector(`#itemList [data-id="${it.id}"]`).click(); await wait();
    document.getElementById('bDel').click(); await wait();
    check('Remove button deletes it', !o.items.some(i => i.id === it.id));
  } catch (e) {
    check('test ran without throwing', false, e.message);
  }
  finish();
})();
