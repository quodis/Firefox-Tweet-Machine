<?
  // set the flash messages array
  $flash = array();
  
  // settings filename
  $settings_filename = 'ftm_config.yaml';
  
  // auth realm that'll be displayed in the auth dialog
  $realm = 'Restricted area';
  
  //user => password
  $users = array('admin' => 'ftm2010!');
  
  if (empty($_SERVER['PHP_AUTH_DIGEST'])) {
      header('HTTP/1.1 401 Unauthorized');
      header('WWW-Authenticate: Digest realm="'.$realm.
             '",qop="auth",nonce="'.uniqid().'",opaque="'.md5($realm).'"');
  
      die('Access Denied');
  }

  // analyze the PHP_AUTH_DIGEST variable
  if (!($data = http_digest_parse($_SERVER['PHP_AUTH_DIGEST'])) ||
      !isset($users[$data['username']]))
      die('Wrong Credentials!');
  
  
  // generate the valid response
  $A1 = md5($data['username'] . ':' . $realm . ':' . $users[$data['username']]);
  $A2 = md5($_SERVER['REQUEST_METHOD'].':'.$data['uri']);
  $valid_response = md5($A1.':'.$data['nonce'].':'.$data['nc'].':'.$data['cnonce'].':'.$data['qop'].':'.$A2);
  
  if ($data['response'] != $valid_response)
      die('Wrong Credentials!');
  
  // ok, valid username & password
/*   $flash['notive'] = 'Your are logged in as: ' . $data['username']; */

  // include "A simple YAML loader/dumper" named spyc
  include_once('spyc.php');

  // write the settings if we received $_POST content
  if ($_POST) {

    // check if the file is writable
      if (is_writable($settings_filename)) {

          // generate yaml to be written to file
          $yaml_string = Spyc::YAMLDump($_POST);
            
          // open the file
          if (!$handle = fopen($settings_filename, 'w+')) {
               $flash['error'] = "Cannot open file ($settings_filename)";
               exit;
          }
      
          // Write $somecontent to our opened file.
          if (fwrite($handle, $yaml_string) === FALSE) {
              $flash['error'] = "Cannot write to file ($settings_filename)";
              exit;
          }
      
          $flash['notice'] = "Success, wrote ($yaml_string) to file ($settings_filename)";

          fclose($handle);
      
      } else if (!is_writable($settings_filename)) {
          $flash['error'] = "The file $settings_filename is not writable";
      }
    } // end if $_POST
    
  // read the current configs
  $config = Spyc::YAMLLoad($settings_filename);

  // function to parse the http auth header
  function http_digest_parse($txt)
  {
      // protect against missing data
      $needed_parts = array('nonce'=>1, 'nc'=>1, 'cnonce'=>1, 'qop'=>1, 'username'=>1, 'uri'=>1, 'response'=>1);
      $data = array();
      $keys = implode('|', array_keys($needed_parts));
  
      preg_match_all('@(' . $keys . ')=(?:([\'"])([^\2]+?)\2|([^\s,]+))@', $txt, $matches, PREG_SET_ORDER);
  
      foreach ($matches as $m) {
          $data[$m[1]] = $m[3] ? $m[3] : $m[4];
          unset($needed_parts[$m[1]]);
      }
  
      return $needed_parts ? false : $data;
  }

?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en-US" lang="en-US">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>FTM - Admin</title>
    <link rel="shortcut icon" href="PathToFavIcon" />
    <link rel="apple-touch-icon" href="PathToapple-touch-icon.png" />
    <style type="text/css" media="all">
			<!--
		  #wrapper {
		    margin: auto;
		    width: 950px;
		  }
		  
			-->
    </style>
    <script type="text/javascript">
		  //<![CDATA[
		  
        
		  
		  //]]>
    </script>
  </head>
  <body>
    <div id="wrapper">
      <div id="header">
        <h1>Firefox Tweet Machine - Admin</h1>
        <p class="messages"><? print_r($flash); ?></p>
      </div>
      <div id="body">
        <h2>Settings</h2>
        <form action="manage.php" method="post">
          <fieldset>
            <legend>Twitter:</legend>
            
            <fieldset>
              <legend>Timeline</legend>
              
              <label for="username">Default Screen Name</label>
              <input id="username" name="username" type="text" value="<? print $config['timeline_username']; ?>" />
              <br />
              
              <label for="count">Timeline Tweet Count</label>
              <input id="count" name="count" type="text" value="<? print $config['timeline_count']; ?>" />
              <br />
              
              <label for="timeline_url">Timeline URL</label>
              <input id="timeline_url" name="timeline_url" type="text" value="<? print $config['timeline_url']; ?>" />
              <br />
            </fieldset>

            <fieldset>
              <legend>Search</legend>
              
              <label for="default_keyword">Default Search Keyword</label>
              <input id="default_keyword" name="keyword" type="text" value="<? print $config['keyword'] ?>" />
              <br />
              
              <label for="results_per_page">Results per Page</label>
              <input id="results_per_page" name="results_per_page" type="text" value="<? print $config['results_per_page'] ?>" />
              <br />
              
              <label for="search_url">Search URL</label>
              <input id="search_url" name="search_url" type="text" value="<? print $config['search_url']; ?>" />
              <br />
            </fieldset>
                        
            
            <br/>

          </fieldset>
          <fieldset>
            <legend>Memcache</legend>
            
            <label for="memcache_host">Memcache Host</label>
            <input id="memcache_host" name="memcache_host" type="text" value="<? print $config['memcache_host']; ?>" />
            <br />

            <label for="memcache_port">Memcache Port</label>
            <input id="memcache_port" name="memcache_port" type="text" value="<? print $config['memcache_port']; ?>" />
            <br />
            
            <label for="memcache_port">Memcache TTL</label>
            <input id="memcache_ttl" name="memcache_ttl" type="text" value="<? print $config['memcache_ttl']; ?>" />
            <br />
            
          </fieldset>
          
          <fieldset>
            <legend>Cron</legend>
            
            <label for="cron_on_demand">On Demand</label>
            <input id="cron_on_demand" name="cron_on_demand" type="checkbox" value="true" <? if ($config['cron_on_demand']) print 'checked="true"'; ?> />
            <br/>
            
            <label for="cron_url">URL</label>
            <input id="cron_url" name="cron_url" type="text" value="<? print $config['cron_url']; ?>" />
            <br/>
          </fieldset>
          
          <br/>
          <br/>
          <button>Save</button>
          <br/>
          <br/>
        </form>
			</div>
      <div id="footer"></div>
    </div>
  </body>
</html>