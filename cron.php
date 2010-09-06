<?

/**
 * @file cron.php
 * fetches data and stores it in a memcache daemon for later retrieval
 */

// ############################################################################
// settings
  // include config file loader
  require_once "lib/yaml_loader.php";
  // load Epi
  include_once('lib/twitteroauth/EpiCurl.php');
  include_once('lib/twitteroauth/EpiOAuth.php');
  include_once('lib/twitteroauth/EpiTwitter.php');
  include_once('lib/twitteroauth/secret.php');
  // instantiate twitter object
  $twitterObj = new EpiTwitter($consumer_key, $consumer_secret, $user_token, $user_secret_token);

  // memcache
  $ttl = ($config['memcache_ttl']) ? $config['memcache_ttl'] : '60';
  $memcache_host = ($config['memcache_host']) ? $config['memcache_host'] : 'localhost';
  $memcache_port = ($config['memcache_port']) ? $config['memcache_port'] : '11211' ;

  // twitter
    // whitelisted user
    $whitelisted['user'] = $config['whitelisted_username'];
    $whitelisted['password'] = $config['whitelisted_password'];
    // search
    $search['results_per_page'] = ($config['search_results_per_page']) ? $config['search_results_per_page'] : 100;
    $search['keyword'] = ($config['search_default_keyword']) ? urlencode($config['search_default_keyword']) : 'firefox';
    $search_url = (isset($config['search_url'])) ? $config['search_url'] : 'http://search.twitter.com/search.json?result_type=recent';
    $search['url'] = $search_url . '&q=' . $search['keyword'] . '&rpp=' . $search['results_per_page'];
    // username timeline to cache
    $timeline['username'] = ($config['timeline_username']) ? $config['timeline_username'] : 'firefox';
    $timeline['count'] = ($config['timeline_count']) ? $config['timeline_count'] : 20 ;
    $timeline['url'] = '/statuses/user_timeline.xml';
    // firefox downloads
    $stats['firefox_download_stats_url'] = (isset($config['firefox_download_stats_url'])) ? $config['firefox_download_stats_url'] : 'http://www.mozilla.com/en-US/firefox/stats/total.php' ;
      // this url isn't in the manage.php
    $stats['firefox_tweet_machine_stats_url'] = ($config['firefox_tweet_machine_stats_url']) ? $config['firefox_tweet_machine_stats_url'] : 'http://www.firefox.com/';
    $stats['firefox_tweet_machine_retweet_stats_url'] = 'http://otter.topsy.com/trackbacks.json?url=' . $stats['firefox_tweet_machine_stats_url'];
    $stats['firefox_tweet_machine_facebook_stats_url'] = 'http://api.facebook.com/restserver.php?method=links.getStats&urls=' . $stats['firefox_tweet_machine_stats_url'];
    // Firefox Tweet Machine Version, if the client detects an upgrade the browser will refresh
    $fftm['version'] = (isset($config['fftm_version'])) ? $config['fftm_version'] : 1;
    
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
  // set curl timeout in seconds
  curl_setopt( $ch, CURLOPT_TIMEOUT, 15 );

// query and store FTM retweet stats
curl_setopt($ch, CURLOPT_URL, $stats['firefox_tweet_machine_retweet_stats_url']);
list( $header, $firefox_tweet_machine_retweet_stats ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['firefox_tweet_machine_retweet_stats'] = curl_getinfo( $ch );
/* echo('HTTP_CODE for RETWEET COUNT: ' . $status['firefox_tweet_machine_retweet_stats']['http_code'] . "<br>\n"); */

// query and store Facebook share stats
curl_setopt($ch, CURLOPT_URL, $stats['firefox_tweet_machine_facebook_stats_url']);
list( $header, $firefox_tweet_machine_facebook_stats ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
  // parse returned xml with simplexml
$firefox_tweet_machine_facebook_stats = new SimpleXMLElement($firefox_tweet_machine_facebook_stats);
$status['firefox_tweet_machine_facebook_stats'] = curl_getinfo( $ch );
echo('HTTP_CODE for FACEBOOK SHARE COUNT: ' . $status['firefox_tweet_machine_facebook_stats']['http_code'] . "<br>\n");

// query and store firefox download stats
curl_setopt($ch, CURLOPT_URL, $stats['firefox_download_stats_url']);
list( $header, $firefox_downloads_total ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['download_stats'] = curl_getinfo( $ch );
echo('HTTP_CODE for FIREFOX DOWNLOAD COUNT: ' . $status['download_stats']['http_code'] . "<br>\n");

// NOTE: perhaps we need to iterate through requests: user timeline, default search
// query and store search results
curl_setopt($ch, CURLOPT_URL, $search['url']);
list( $header, $search_results ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
$status['search'] = curl_getinfo( $ch );
echo('HTTP_CODE for SEARCH: ' . $status['search']['http_code'] . "<br>\n");

// query and store user timeline
// make the request
$request = $twitterObj->get($timeline['url'], array('screen_name' => $timeline['username'], 'count' => $timeline['count']));
// set the contents, create SimpleXMLElement object
$timeline_statuses_xml = new SimpleXMLElement($request->responseText);
// convert to array
$timeline_statuses_object_vars = get_object_vars($timeline_statuses_xml);
// convert to json
$timeline_statuses = json_encode($timeline_statuses_object_vars['status']);

echo('HTTP_CODE for TIMELINE: ' . $request->code . "<br>\n");

// close the curl session
curl_close( $ch );

// read and store the special_bubbles values array
$special_bubbles = array();
$special_bubbles['sb_timeline_step'] = ($config['specialbubble_timeline_step']) ? $config['specialbubble_timeline_step'] : 10;
$special_bubbles['sb_followers_step'] = ($config['specialbubble_followers_step']) ? $config['specialbubble_followers_step'] : 20;
$special_bubbles['sb_clock_step'] = ($config['specialbubble_clock_step']) ? $config['specialbubble_clock_step'] : 1;
$special_bubbles['sb_ffdownloads_total'] = reset(json_decode($firefox_downloads_total));
$special_bubbles['sb_ffdownloads_step'] = ($config['specialbubble_firefox_downloads_step']) ? $config['specialbubble_firefox_downloads_step'] : 100000;

// read and store the display values array
$display['ds_type'] = ($config['countdown_display_type']) ? $config['countdown_display_type'] : 'followers';
$display['ds_datetime'] = ($config['countdown_display_datetime']) ? $config['countdown_display_datetime'] : '';
$display['ds_datetime_description'] = ($config['countdown_display_datetime_description']) ? $config['countdown_display_datetime_description'] : '';
$display['ds_datetime_reached'] = ($config['countdown_display_datetime_reached']) ? $config['countdown_display_datetime_reached'] : 'We\'re there';
$display['ds_followers'] = ($config['countdown_display_followers']) ? $config['countdown_display_followers'] : 5000;
$display['ds_followers_description'] = ($config['countdown_display_followers_description']) ? $config['countdown_display_followers_description'] : 'Firefox download count just increased by 5000!';
$display['ds_stats_retweets'] = json_decode($firefox_tweet_machine_retweet_stats)->response->total;
$display['ds_stats_facebook_shares'] = intval(reset($firefox_tweet_machine_facebook_stats->link_stat->share_count));

// store the search results
$search_data = (!$search_results) ? '' : json_decode($search_results);
// store the firefox timeline
$timeline_data = (!$timeline_statuses) ? '' : json_decode($timeline_statuses);
// store the triggers
$default_data->special_bubbles = $special_bubbles;
// store the display values
$default_data->display = $display;
// keywords
$default_data->keywords = array('highlights' => array('green' => $config['keywords_highlights_green'], 'orange' => $config['keywords_highlights_orange'], 'pink' => $config['keywords_highlights_pink'], 'violet' => $config['keywords_highlights_violet']), 'excluded' => $config['keywords_excluded']);
// firefox tweet machine version
$default_data->fftm_version = $fftm['version'];

// connect to memcache
$memcache = new Memcache;
$memcache->connect($memcache_host, $memcache_port) or die ("Could not connect");

// store the contents in memcache
// conditional to only store results if twitter is up and returns results
if ( count($search_data->results) || ($status['timeline']['http_code'] == 200) ) {

  $memcache->set('timeline_data', $timeline_data, false, $ttl) or die ("Failed to save data at the server");
  $memcache->set('search_data', $search_data, false, $ttl) or die ("Failed to save data at the server");
  $memcache->set('default_data', $default_data, false, $ttl) or die ("Failed to save data at the server");
  echo "Stored data in memcache (data will expire in " . $ttl . " seconds)<br/>\n";
  
  $get_result = array_merge( array($memcache->get('search_data')), array($memcache->get('timeline_data')), array($memcache->get('default_data')) );
  echo "Data from the cache:<br/>\n";
  
  echo '<pre>';
  print_r($get_result);
  echo '</pre>';
  
} else {
  echo '<br /> unable to fetch data <br />';
}

?>