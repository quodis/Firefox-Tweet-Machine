<? 

// include "A simple YAML loader/dumper" named spyc
require_once "spyc.php";

// create the config file if it doesn't exist
if (!file_exists('ftm_config.yml')) {
  touch('ftm_config.yml');
}

// read the configuration file
$config = Spyc::YAMLLoad('ftm_config.yml');
// return the config array
return($config);

?>