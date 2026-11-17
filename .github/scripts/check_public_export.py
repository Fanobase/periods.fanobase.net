"""Check that the published files match a public-only export."""
import hashlib
import json
from pathlib import Path, PurePosixPath

root = Path(__file__).resolve().parents[2]
allowed = {'ckp15', 'kalashnikov19', 'type-a'}
manifest = json.loads((root/'public-export.json').read_text())
assert manifest['audience'] == 'public'
assert set(manifest['datasets']) == allowed
for name, digest in manifest['files'].items():
    path = PurePosixPath(name)
    assert not path.is_absolute() and '..' not in path.parts
    assert path.parts[0] not in {'.git', '.github', 'data', 'research', 'private', '.build'}
    assert hashlib.sha256((root/name).read_bytes()).hexdigest() == digest, name
summary = json.loads((root/'downloads/summary.json').read_text())
assert summary['audience'] == 'public'
assert {row['key'] for row in json.loads((root/'downloads/datasets.json').read_text())} == allowed
records = [json.loads(line) for line in (root/'downloads/all-periods.jsonl').read_text().splitlines()]
assert len(records) == summary['total']
for row in records:
    assert set(row['source_keys']) <= allowed
    assert all(source['dataset'] in {'type-a-hpc', 'type-a-public', 'zenodo-5708307'}
               for source in row['source_observations'])
extra = {'.gitattributes', '.gitignore', 'README.md', 'public-export.json', '.nojekyll', 'CNAME'}
for path in root.rglob('*'):
    if path.is_file():
        name = path.relative_to(root).as_posix()
        if name.split('/')[0] not in {'.git', '.github'}:
            assert name in manifest['files'] or name in extra, 'Unexpected public file: '+name
print(f'Verified {len(records)} public period groups and {len(manifest["files"])} exported files.')
