import json

from langraph.utils.json_parsing import strip_fences


class TestStripFences:
    def test_plain_json(self):
        text = '[{"key": "value"}]'
        assert json.loads(strip_fences(text)) == [{"key": "value"}]

    def test_json_code_fence(self):
        text = '```json\n[{"key": "value"}]\n```'
        assert json.loads(strip_fences(text)) == [{"key": "value"}]

    def test_bare_code_fence(self):
        text = '```\n[{"key": "value"}]\n```'
        assert json.loads(strip_fences(text)) == [{"key": "value"}]
