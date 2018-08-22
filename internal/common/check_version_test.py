import os
import unittest

def resolve_runfile(path):
  if os.getenv('RUNFILES_MANIFEST_ONLY') != "1":
    return os.path.join(os.environ['TEST_SRCDIR'], path)

  manifest = os.getenv('RUNFILES_MANIFEST_FILE')
  with open(manifest) as f:
    for line in f.readlines():
      if line.split()[0] == path:
        return line.split()[1]
  raise "Cannot find %s in manifest %s" % (path, manifest)


class CheckVersionTest(unittest.TestCase):
  BZL_PATH = 'build_bazel_rules_nodejs/internal/common/check_version.bzl'

  def setUp(self):
    self.globals = {}
    exec(open(resolve_runfile(self.BZL_PATH)).read(), self.globals)

  def testVersionComparison(self):
    result = self.globals['check_version']('1.2.2', '1.2.3')
    self.assertIs(result, False)

  def testNotAlphaComparison(self):
    result = self.globals['check_version']('1.12.3', '1.2.1')
    self.assertIs(result, True)

  def testReleaseCandidate(self):
    result = self.globals['check_version']('0.8.0rc2', '0.8.0')
    self.assertIs(result, True)

if __name__ == '__main__':
  unittest.main()
