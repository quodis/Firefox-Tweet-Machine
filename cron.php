<?

/**
 * @file cron.php
 * fetches data and stores it in a memcache daemon for later retrieval
 */

// ############################################################################
// settings
  // include config file loader
  require_once "lib/yaml_loader.php";

  // memcache
  $ttl = ($config['memcache_ttl']) ? $config['memcache_ttl'] : '60';
  $memcache_host = ($config['memcache_host']) ? $config['memcache_host'] : 'localhost';
  $memcache_port = ($config['memcache_port']) ? $config['memcache_port'] : '11211' ;

  // twitter
    // whitelisted user
    $whitelisted = array();
    $whitelisted['user'] = $config['whitelisted_username'];
    $whitelisted['password'] = $config['whitelisted_password'];
    // search
    $search = array();
    $search['results_per_page'] = ($config['search_results_per_page']) ? $config['search_results_per_page'] : 100;
    $search['keyword'] = ($config['search_default_keyword']) ? urlencode($config['search_default_keyword']) : 'firefox';
    $search['url'] = ($config['search_url']) ? $config['search_url'] : 'http://search.twitter.com/search.json?result_type=recent&show_user=true&rpp=';
    // username timeline to cache
    $timeline = array();
    $timeline['username'] = ($config['timeline_username']) ? $config['timeline_username'] : 'firefox';
    $timeline['count'] = ($config['timeline_count']) ? $config['timeline_count'] : 20 ;
    $timeline['url'] = ($config['timeline_url']) ? $config['timeline_url'] : 'http://api.twitter.com/1/statuses/user_timeline.json?screen_name=';
    // firefox downloads
    $firefox['download_stats_url'] = ($config['firefox_download_stats_url']) ? $config['firefox_download_stats_url'] : 'http://www.mozilla.com/en-US/firefox/stats/total.php' ;
    
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

// query and store firefox download stats
curl_setopt($ch, CURLOPT_URL, $firefox['download_stats_url']);
list( $header, $firefox_downloads_total ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['downloads'] = curl_getinfo( $ch );
echo('firefox stats: ' . $status['downloads']['http_code'] . "<br>\n");

// TODO: perhaps we need to iterate through requests: user timeline, default search
// query and store search results
curl_setopt($ch, CURLOPT_URL, $search['url'] . $search['results_per_page'] . '&q=' . $search['keyword']);
list( $header, $search_results ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['search'] = curl_getinfo( $ch );
echo('search: ' . $status['search']['http_code'] . "<br>\n");

// query and store user timeline
  // set http auth for timeline 
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC );
curl_setopt($ch, CURLOPT_USERPWD, $whitelisted['user'] . ':' . $whitelisted['password']);
  // make "the call"
curl_setopt($ch, CURLOPT_URL, $timeline['url'] . $timeline['username'] . '&count=' . $timeline['count']);
list( $header, $timeline ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['timeline'] = curl_getinfo( $ch );
echo('timeline: ' . $status['timeline']['http_code'] . "<br>\n");


// read and store the special_bubbles values array
$special_bubbles = array();
$special_bubbles['sb_timeline_step'] = ($config['specialbubble_timeline_step']) ? $config['specialbubble_timeline_step'] : 10;
$special_bubbles['sb_followers_step'] = ($config['specialbubble_followers_step']) ? $config['specialbubble_followers_step'] : 20;
$special_bubbles['sb_clock_step'] = ($config['specialbubble_clock_step']) ? $config['specialbubble_clock_step'] : 1;
$special_bubbles['sb_ffdownloads_total'] = reset(json_decode($firefox_downloads_total));
$special_bubbles['sb_ffdownloads_step'] = ($config['specialbubble_firefox_downloads_step']) ? $config['specialbubble_firefox_downloads_step'] : 100000;

// read and store the display values array
$display = array();
$display['ds_type'] = ($config['countdown_display_type']) ? $config['countdown_display_type'] : 'followers';
$display['ds_datetime'] = ($config['countdown_display_datetime']) ? $config['countdown_display_datetime'] : '';
$display['ds_datetime_description'] = ($config['countdown_display_datetime_description']) ? $config['countdown_display_datetime_description'] : '';
$display['ds_followers'] = ($config['countdown_display_followers']) ? $config['countdown_display_followers'] : 5000;
$display['ds_followers_description'] = ($config['countdown_display_followers_description']) ? $config['countdown_display_followers_description'] : 'Firefox download count just increased by 5000!';

// close the curl session
curl_close( $ch );

$default_data = new stdClass;

// store the search results
$default_data->search_results = (!$search_results) ? 'twitter search down' : json_decode($search_results);
// store the firefox timeline
$default_data->timeline = (!$timeline) ? 'twitter api down' : json_decode($timeline);
// store the triggers
$default_data->special_bubbles = $special_bubbles;
// store the display values
$default_data->display = $display;


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