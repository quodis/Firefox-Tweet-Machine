<?

/**
 * @file cron.php
 * fetches data and stores it in a memcache daemon for later retrieval
 */

// ############################################################################
// settings
  // include config file loader
  require_once "yaml_loader.php";

  // debug
/*   print_r($config); */

  // memcache
  $ttl = $config['memcache_ttl'];
  $memcache_host = $config['memcache_host'];
  $memcache_port = $config['memcache_port'];

  // twitter
    // search
    $search = array();
    $search['results_per_page'] = $config['search_results_per_page'];
    $search['keyword'] = urlencode($config['search_default_keyword']);
    $search['url'] = ($config['search_url']) ? $config['search_url'] : 'http://search.twitter.com/search.json?result_type=recent&rpp=';
    // username timeline to cache
    $timeline = array();
    $timeline['username'] = $config['timeline_username'];
    $timeline['count'] = $config['timeline_count'];
    $timeline['url'] = ($config['timeline_url']) ? $config['timeline_url'] : 'http://api.twitter.com/1/statuses/user_timeline.json?screen_name=';
    // firefox downloads
    $firefox['download_stats_url'] = $config['firefox_download_stats_url'];
    
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
curl_setopt($ch, CURLOPT_URL, $search['url'] . $search['results_per_page'] . '&q=' . $search['keyword']);
list( $header, $search_results ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['search'] = curl_getinfo( $ch );
echo('search: ' . $status['search']['http_code'] . "<br>\n");

// query and store user timeline
curl_setopt($ch, CURLOPT_URL, $timeline['url'] . $timeline['username'] . '&count=' . $timeline['count']);
list( $header, $timeline ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['timeline'] = curl_getinfo( $ch );
echo('timeline: ' . $status['timeline']['http_code'] . "<br>\n");

// query and store firefox download stats
curl_setopt($ch, CURLOPT_URL, $firefox['download_stats_url']);
list( $header, $firefox_download_stats ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['downloads'] = curl_getinfo( $ch );
echo('firefox stats: ' . $status['downloads']['http_code'] . "<br>\n");

// read and store the triggers array
$triggers = array();
$triggers['followers'] = $config['firefox_follower_milestone'];
$triggers['minutes'] = $config['clock_step'];
$triggers['countdown'] = array('milestone' => $config['countdown_date'],'type' => $config['countdown_type']);
$triggers['firefox_download_stats'] = reset(json_decode($firefox_download_stats));
$triggers['firefox_download_step'] = $config['firefox_download_step'];

// close the curl session
curl_close( $ch );

$default_data = new stdClass;

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

?>