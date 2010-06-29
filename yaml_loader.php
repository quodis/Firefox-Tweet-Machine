<? 

// include "A simple YAML loader/dumper" named spyc
require_once "spyc.php";
// read the current configs
$config = Spyc::YAMLLoad('ftm_config.yaml');

if ($config[0]) {
  return('unable to read config file');
  exit;
} else {
  return($config);
}

?>