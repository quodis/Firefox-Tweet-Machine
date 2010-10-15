<?

/**
 * @file proxy.php
 * fetches data from memcache if no params are specified
 *  if there's no data in memcache and cron_on_demand is true forces cron.php to fetch new data
 *
 * $_GET['q'] and $_GET['url'] take precedence over default values (although url will probably be dropped 'cos it's really unused and allows this script to be used for other purposes)
 *
 * $_GET['q'] will be received from the FTM client
 */

// include config file loader
require_once "lib/yaml_loader.php";

// Change these configuration options if needed, see above descriptions for info.
$enable_jsonp    = false;
$enable_native   = true;
$valid_url_regex = '/.*/';

// memcache
$memcache_host = ($config['memcache_host']) ? $config['memcache_host'] : 'localhost';
$memcache_port = ($config['memcache_port']) ? $config['memcache_port'] : '11211' ;
// if true, this script will run the cron.php when there are no results in cache and client requests data as in: this script is executed ~comment by: Captain Obvious
$cron_on_demand = (isset($config['cron_on_demand'])) ? $config['cron_on_demand'] : false;
// cron_url is actually cron php filename
$cron_url = ($config['cron_url']) ? $config['cron_url'] : 'http://' . $_SERVER['SERVER_NAME'] . '/cron.php';
// search
$search['results_per_page'] = ($config['search_results_per_page']) ? $config['search_results_per_page'] : 100;
// search keyword
$search['keyword'] = (isset($_GET['q'])) ? urlencode($_GET['q']) : (($config['search_default_keyword']) ? urlencode($config['search_default_keyword']) : 'firefox');

// ############################### fetch the response data ##################################

// get results from memcache if no url or keyword is given
if ( !isset($_GET['url']) && !isset($_GET['q']) && !isset($_GET['screen_names']) ) {

  // connect to memcache
  $memcache = new Memcache;
  $memcache->connect($memcache_host, $memcache_port) or die ("Could not connect");
  
  // fetch data
  $search_data = array($memcache->get('search_data'));
  $timeline_data = array($memcache->get('timeline_data'));
  $default_data = array($memcache->get('default_data'));
  
  // build the contents json
  $contents = json_encode(array_merge( 
    array('search_results' => reset($search_data)), 
    array('timeline' => reset($timeline_data)), 
    array('special_bubbles' => reset($default_data)->special_bubbles), 
    array('display' => reset($default_data)->display), array('keywords' => reset($default_data)->keywords), 
    array('version' => reset($default_data)->fftm_version))  );
  
  // set status to ERROR if there are no contents, 200 OK otherwise
  $status = array( 'http_code' => ($contents == "false") ? 'ERROR' : 200 );
  
  // force cache refresh when it expires
  if ($contents == "false" && $cron_on_demand) {
    // nothing in cache, forcing refresh
    // init curl resource
    $ch = curl_init();
    // configure curl session
      // return curl output instead of boolean
      curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
      // set the url
      curl_setopt($ch, CURLOPT_URL, $cron_url);
      list( $header, $curl_result ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
      curl_close( $ch );
      
    // fetch the default_data
    $contents = json_encode($memcache->get('default_data'));
    
    // Passed url not specified.
    $status = array( 'http_code' => ($contents === "false") ? 'ERROR' : 200 );

  }

// proxy the contents of the parameter url
} else if ( isset($_GET['screen_names']) ) {

  // load Epi
  include_once('lib/twitteroauth/EpiCurl.php');
  include_once('lib/twitteroauth/EpiOAuth.php');
  include_once('lib/twitteroauth/EpiTwitter.php');
  include_once('lib/twitteroauth/secret.php');

  // instantiate twitter object
  $twitterObj = new EpiTwitter($consumer_key, $consumer_secret, $user_token, $user_secret_token);
  // make the request
  $request = $twitterObj->get('/users/lookup.json', array('screen_name' => $_GET['screen_names']));
  // set the contents
  $contents = json_encode($request->response);
  // set the HTTP Auth 
  $status['http_code'] = $request->code;

}

// ############################### build the response data ##################################

// Split header text into an array.
$header_text = preg_split( '/[\r\n]+/', $header );

// $data will be serialized into JSON data.
$data = array();

// Propagate all cURL request / response info to the JSON data object.
$data['status']['http_code'] = $status['http_code'];

// Set the JSON data object contents, decoding it from JSON if possible.
$decoded_json = json_decode( $contents );
$data['contents'] = $decoded_json ? $decoded_json : $contents;

// Generate appropriate content-type header.
$is_xhr = (isset($_SERVER['HTTP_X_REQUESTED_WITH'])) ? strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest' : '';
header( 'Content-type: application/' . ( $is_xhr ? 'json' : 'x-javascript' ) );

// Generate JSON/JSONP string
print json_encode( $data );

?>