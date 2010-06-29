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
require_once "yaml_loader.php";

// Change these configuration options if needed, see above descriptions for info.
$enable_jsonp    = false;
$enable_native   = false;
$valid_url_regex = '/.*/';

// memcache
$memcache_host = $config['memcache_host'];
$memcache_port = $config['memcache_port'];
// if true, this script will run the cron.php when there are no results in cache and client requests data as in: this script is executed ~comment by: Captain Obvious
$cron_on_demand = true;
// cron_url is actually cron php filename
$cron_url = $config['cron_url'];


// ############################################################################

// search keyword
$keyword = ($_GET['q']) ? $_GET['q'] : $config['search_default_keyword'];

// fetch the gived url or a default one (twitter api - search)
$url = ($_GET['url']) ? $_GET['url'] : 'http://search.twitter.com/search.json?result_type=recent&q=' . urlencode($keyword);

if ( ($keyword == $config['search_default_keyword']) ) {

  // connect to memcache
  $memcache = new Memcache;
  $memcache->connect($memcache_host, $memcache_port) or die ("Could not connect");
  
  // fetch the default_data
  $contents = json_encode($memcache->get('default_data'));
  
  // Passed url not specified.
  $status = array( 'http_code' => ($contents == "false") ? 'ERROR' : 200 );
  
  // just an experiment, force cache refresh when it expires
  if ($contents == "false" && $cron_on_demand) {
/*     echo 'nothing in cache, forcing refresh'; */
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
  
} else if ( !preg_match( $valid_url_regex, $url ) ) {
  
  // Passed url doesn't match $valid_url_regex.
  $contents = 'ERROR: invalid url';
  $status = array( 'http_code' => 'ERROR' );
  
} else {
  $ch = curl_init( $url );
  
  if ( strtolower($_SERVER['REQUEST_METHOD']) == 'post' ) {
    curl_setopt( $ch, CURLOPT_POST, true );
    curl_setopt( $ch, CURLOPT_POSTFIELDS, $_POST );
  }
  
  if ( $_GET['send_cookies'] ) {
    $cookie = array();
    foreach ( $_COOKIE as $key => $value ) {
      $cookie[] = $key . '=' . $value;
    }
    if ( $_GET['send_session'] ) {
      $cookie[] = SID;
    }
    $cookie = implode( '; ', $cookie );
    
    curl_setopt( $ch, CURLOPT_COOKIE, $cookie );
  }
  
  curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, true );
  curl_setopt( $ch, CURLOPT_HEADER, true );
  curl_setopt( $ch, CURLOPT_RETURNTRANSFER, true );
  
  curl_setopt( $ch, CURLOPT_USERAGENT, $_GET['user_agent'] ? $_GET['user_agent'] : $_SERVER['HTTP_USER_AGENT'] );
  
  list( $header, $contents ) = preg_split( '/([\r\n][\r\n])\\1/', curl_exec( $ch ), 2 );
  
  $status = curl_getinfo( $ch );
  
  curl_close( $ch );
}

// Split header text into an array.
$header_text = preg_split( '/[\r\n]+/', $header );

if ( $_GET['mode'] == 'native' ) {
  if ( !$enable_native ) {
    $contents = 'ERROR: invalid mode';
    $status = array( 'http_code' => 'ERROR' );
  }
  
  // Propagate headers to response.
  foreach ( $header_text as $header ) {
    if ( preg_match( '/^(?:Content-Type|Content-Language|Set-Cookie):/i', $header ) ) {
      header( $header );
    }
  }
  
  print $contents;
  
} else {
  
  // $data will be serialized into JSON data.
  $data = array();
  
  // Propagate all HTTP headers into the JSON data object.
  if ( $_GET['full_headers'] ) {
    $data['headers'] = array();
    
    foreach ( $header_text as $header ) {
      preg_match( '/^(.+?):\s+(.*)$/', $header, $matches );
      if ( $matches ) {
        $data['headers'][ $matches[1] ] = $matches[2];
      }
    }
  }
  
  // Propagate all cURL request / response info to the JSON data object.
  if ( $_GET['full_status'] ) {
    $data['status'] = $status;
  } else {
    $data['status'] = array();
    $data['status']['http_code'] = $status['http_code'];
  }
  
  // Set the JSON data object contents, decoding it from JSON if possible.
  $decoded_json = json_decode( $contents );
  $data['contents'] = $decoded_json ? $decoded_json : $contents;
  
  // Generate appropriate content-type header.
  $is_xhr = strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest';
  header( 'Content-type: application/' . ( $is_xhr ? 'json' : 'x-javascript' ) );
  
  // Get JSONP callback.
  $jsonp_callback = $enable_jsonp && isset($_GET['callback']) ? $_GET['callback'] : null;
  
  // Generate JSON/JSONP string
  $json = json_encode( $data );
  
  print $jsonp_callback ? "$jsonp_callback($json)" : $json;
  
}

?>