const fs = require('node:fs');
const path = require('node:path');
const directory = __dirname;
const data = JSON.parse(fs.readFileSync(path.join(directory, 'layouts.json'), 'utf8'));
const template = fs.readFileSync(path.join(directory, 'ui.template.html'), 'utf8');
fs.writeFileSync(path.join(directory, 'ui.html'), template.replace('__LAYOUTS__', JSON.stringify(data).replace(/</g, '\\u003c')));
const manifest = {
    fileUrl: 'https://www.figma.com/design/' + data.fileKey,
    preparedOn: '2026-10-28', status: 'prepared_not_applied_in_figma_due_to_mcp_starter_limit',
    screens: data.screens.map((screen) => {
        const counts = { text: 0, frame: 0, svg: 0, contentImages: 0 };
        const visit = (node) => { counts[node.type]++; if (node.image) counts.contentImages++; (node.children || []).forEach(visit); };
        screen.tree.forEach(visit);
        return { key: screen.key, name: screen.name, existingDesktopId: screen.id,
            width: screen.width, height: screen.height, viewport: screen.viewport,
            sourceRuntimeErrors: screen.sourceRuntimeErrors, sourceLayerCounts: counts,
            preview: 'previews/' + screen.key + '.png',
            nativeFigmaAudit: 'not_run_due_to_mcp_starter_limit' };
    })
};
fs.writeFileSync(path.join(directory, 'desktop-checks.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ screens: manifest.screens.length, width: 1440, editableSourceLayers: manifest.screens.map((screen) => ({ key: screen.key, ...screen.sourceLayerCounts })) }));
