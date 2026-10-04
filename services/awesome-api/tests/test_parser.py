from awesome_api.parser import canonical_repository, parse_catalog, parse_projects


def test_canonical_repository_deduplicates_case_anchors_and_git_suffix():
    assert canonical_repository("https://github.com/Org/Repo.git#install") == "org/repo"
    assert canonical_repository("https://github.com/Org/Repo/") == "org/repo"
    assert canonical_repository("http://github.com/Org/Repo?tab=readme") == "org/repo"


def test_canonical_repository_rejects_non_repository_and_unsafe_urls():
    for url in [
        "https://github.com.evil.test/org/repo", "https://github.com@evil.test/org/repo",
        "https://user:pass@github.com/org/repo", "https://github.com:443/org/repo",
        "https://github.com/org/repo/actions/workflows/test.yml/badge.svg",
        "https://github.com/org/repo/blob/main/README.md", "https://github.com/topics/python",
        "https://github.com/org", "javascript:alert(1)", "https://github.com/../repo",
    ]:
        assert canonical_repository(url) is None, url


def test_catalog_reads_headings_nested_bullets_and_references():
    parsed = parse_catalog("""# Awesome
## Developer Tools
- [Useful Tools](https://github.com/Org/awesome-tools) - Original description.
  - [More tools][more]
## Databases
- [Useful Tools](https://github.com/org/awesome-tools#contents)
[more]: https://github.com/Other/awesome-more
""")
    assert len(parsed.records) == 2
    assert parsed.records[0]["categories"] == ["developer-tools", "databases"]
    assert parsed.records[0]["description"] == "Original description."
    assert parsed.records[0]["kind"] == "list"
    assert parsed.category_names == {"developer-tools": "Developer Tools", "databases": "Databases"}


def test_projects_skip_badges_self_links_fences_and_preserve_description():
    records = parse_projects("""# Tools
![Build](https://github.com/org/badges)
- [Self](https://github.com/org/awesome-tools#top)
- [Project](https://github.com/Other/Project) - A useful **original** project.
  - [Project](https://github.com/other/project.git#install)
- [Other list](https://github.com/org/awesome-more)
```md
- [Example](https://github.com/example/example)
```
- [Website](https://example.test/tool)
""", "org/awesome-tools", ["developer-tools"])
    assert len(records) == 2
    assert records[0]["id"] == "other/project"
    assert records[0]["name"] == "Project"
    assert records[0]["description"] == "A useful **original** project."
    assert records[0]["kind"] == "project"
    assert records[1]["kind"] == "list"
