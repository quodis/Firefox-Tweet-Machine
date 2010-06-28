<?

// include "A simple YAML loader/dumper" named spyc
require_once "spyc.php";
// read the current configs
$config = Spyc::YAMLLoad($settings_filename);

// ############################################################################
// settings
  // include global settings

  // memcache
  $ttl = ($_GET['ttl']) ? $_GET['ttl'] : 60;
  $memcache_host = ($_GET['memcache_host']) ? $_GET['memcache_host'] : 'localhost';
  $memcache_port = ($_GET['memcache_port']) ? $_GET['memcache_port'] : 11211;

  // twitter
    // username timeline to cache
    $timeline = array();
    $timeline['username'] = $_GET['timeline_username'] ? $_GET['timeline_username'] : 'firefox' ;
    $timeline['count'] = $_GET['timeline_count'] ? $_GET['timeline_count'] : 20 ;
    $timeline['url'] = $_GET['timeline_url'] ? $_GET['timeline_url'] : 'http://api.twitter.com/1/statuses/user_timeline.json?screen_name=' . $timeline['username'] . '&count=' . $timeline['count'];
    // search
    $search = array();
    $search['results_per_page'] = ($_GET['rpp']) ? $_GET['rpp'] : 40 ;
    $search['keyword'] = ($_GET['search_keyword']) ? $_GET['search_keyword'] : 'firefox';
    $search['url'] = ($_GET['search_url']) ? $_GET['search_url'] : 'http://search.twitter.com/search.json?result_type=recent&rpp=' . $search['results_per_page'] . '&q=' . $search['keyword'];
    
// ############################################################################

// init curl resource
$ch = curl_init();
// configure curl session
  // follow redirects
  curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, true );
  // return request headers
  curl_setopt( $ch, CURLOPT_HEADER, true );
  // return curl output instead of boolean
  curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );

// TODO: perhaps we need to iterate through requests: user timeline, default search
// query and store search results
curl_setopt($ch, CURLOPT_URL, $search['url']);
list( $header, $search_results ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status = curl_getinfo( $ch );
echo('search: ' . $status['http_code'] . "<br>\n");

// query and store user timeline
curl_setopt($ch, CURLOPT_URL, $timeline['url']);
list( $header, $timeline ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status = curl_getinfo( $ch );
echo('timeline: ' . $status['http_code'] . "<br>\n");

// read and store the triggers array
$triggers = array();
$triggers['followers'] = 1000;
$triggers['minutes'] = 60;
$triggers['countdown'] = array('milestone' => date('d-m-Y'),'type' => 'event');

// close the curl session
curl_close( $ch );

$default_data = new stdClass;
// never know when the twitter api is gonna go kaput
// when it goes the response from curl is nil
/* if ($status['http_code'] == 200 || $search_results) { */
  // store the search results
  $default_data->search_results = (!$search_results) ? 'twitter search down' : json_decode($search_results);
  // store the firefox timeline
  $default_data->timeline = (!$timeline) ? 'twitter api down' : json_decode($timeline);
  // store the triggers
  $default_data->triggers = $triggers;

  
  // connect to memcache
  $memcache = new Memcache;
  $memcache->connect($memcache_host, $memcache_port) or die ("Could not connect");
  
  // store the contents in memcache
  $memcache->set('default_data', $default_data, false, $ttl) or die ("Failed to save data at the server");
  echo "Store data in the cache (data will expire in " . $ttl . " seconds)<br/>\n";
  
  $get_result = $memcache->get('default_data');
  echo "Data from the cache:<br/>\n";
  
  var_dump($get_result);

/* } */

?>