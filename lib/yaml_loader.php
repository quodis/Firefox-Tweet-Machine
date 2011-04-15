<? 

// include "A simple YAML loader/dumper" named spyc
require_once "spyc.php";
// set the filepath
$ftm_config_path = dirname(__FILE__) . '/../ftm_config.yml';
// load the ftm_config.yml
$ftm_config = fread(fopen($ftm_config_path, 'r'), filesize($ftm_config_path)) or false;

// create the config file if it doesn't exist
if (!$ftm_config) {
  touch($ftm_config_path);
}

// read the configuration file
$config = Spyc::YAMLLoad($ftm_config);

// return the config array
return($config);

?>