<?
  // set the flash messages array
  $flash = array();
  // include config file loader
  require_once "lib/yaml_loader.php";
  // settings filename
  $settings_filename = 'ftm_config.yml';

  // AUTH - START ###########################################################################

  // logout
  if ($_GET['action'] == 'logout') {
    // clear cookies
    setcookie('fftm_tok', '', time() + (3600 * 7), '/', $_SERVER['SERVER_NAME'], false, true);
    setcookie('fftm_sec', '', time() + (3600 * 7), '/', $_SERVER['SERVER_NAME'], false, true);
    // refresh page
    die( header('refresh:0;url=manage.php') );
  };
  
  include 'lib/twitteroauth/EpiCurl.php';
  include 'lib/twitteroauth/EpiOAuth.php';
  include 'lib/twitteroauth/EpiTwitter.php';
  include 'lib/twitteroauth/secret.php';
  
  $twitterObj = new EpiTwitter($consumer_key, $consumer_secret);
  
  // if we're returning from twitter
  if ($_GET['oauth_token']) {
    $twitterObj->setToken($_GET['oauth_token']);
    $token = $twitterObj->getAccessToken();
    // save token and secret using cookies
    setcookie('fftm_tok', $token->oauth_token, time() + (3600 * 7), '/', $_SERVER['SERVER_NAME'], false, true);
    setcookie('fftm_sec', $token->oauth_token_secret, time() + (3600 * 7), '/', $_SERVER['SERVER_NAME'], false, true);

    // set token either from GET or stored COOKIE values
    $twitterObj->setToken(($token->oauth_token) ? $token->oauth_token : $_COOKIE['fftm_tok'] , ($token->oauth_token_secret) ? $token->oauth_token_secret : $_COOKIE['fftm_sec']);
    // authenticate with twitter
    $twitterInfo= $twitterObj->get_accountVerify_credentials();
    $twitterInfo->response;

  }

  // if there are no allowed admins, and we're returning from twitter oauth (callback)
  if ( empty($config['allowed_admins']) && $_GET['oauth_token'] ) {
  
    // if the file isn't writable
    if (!is_writable($settings_filename)) {
      die('config file is not writable');
    // if we can write to the file
    } else {
      // generate the yaml
      $yaml_string = Spyc::YAMLDump(array('allowed_admins' => $twitterInfo->screen_name));
      // write it to the config file
      $handle = fopen($settings_filename, 'w+');
      fwrite($handle, $yaml_string);
      fclose($handle);
      // refresh page
      die(header('refresh:0'));
    };
  }

  // die if not authenticated
  if ( empty($config['allowed_admins']) || !in_array( strtolower($twitterInfo->screen_name), explode(',', strtolower($config['allowed_admins']) ) ) ) {
    die('<a href="' . $twitterObj->getAuthorizationUrl() . '">Authorize with Twitter</a>');
  }

  // AUTH - END ###########################################################################

  // write the settings if we received $_POST content and we're authenticated
  if ($_POST && $twitterInfo->screen_name) {

    // check if the file is writable
      if (is_writable($settings_filename)) {

          // generate yaml to be written to file
          $yaml_string = Spyc::YAMLDump($_POST);

          // open the file for writing
          if (!$handle = fopen($settings_filename, 'w+')) {
               $flash['error'] = "Cannot open file ($settings_filename)";
               exit;
          }

          // Write $yaml_string to our opened file.
          if (fwrite($handle, $yaml_string) === FALSE) {
              $flash['error'] = "Cannot write to file ($settings_filename)";
              exit;
          }

          $flash['success'] = "Saved!"; //, wrote ($yaml_string) to file ($settings_filename)";

          fclose($handle);

      } else if (!is_writable($settings_filename)) {
          $flash['error'] = "The file $settings_filename is not writable";
      }
    } // end if $_POST

  // require config file loader
  require "lib/yaml_loader.php";
?>
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>FTM - Manage</title>
    <link rel="shortcut icon" href="PathToFavIcon" />
    <link rel="apple-touch-icon" href="PathToapple-touch-icon.png" />
    <style type="text/css" media="all">
			<!--
        p { font-style: italic !important; }
        p.description { margin-top: 0 }
        p.field.description { margin: 0; }
			-->
    </style>
    <link href="assets/css/blueprint/src/reset.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="assets/css/blueprint/src/grid.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="assets/css/blueprint/src/forms.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="assets/css/blueprint/src/typography.css" media="screen" rel="stylesheet" type="text/css" />

    <script src="assets/js/jquery-1.4.2.min.js"></script>

    <script type="text/javascript">
		  //<![CDATA[

        $(document).ready(function(){
        /*
        **********
          conditional input toggle
        **********
        */
          // show appropriate trigger input on Countdown fieldset based on selected Countdown type
          function init_select() {
            $('#countdown_display_type option').each(function() {
              // build the id of the input to be manipulated
              target_fieldset_id = '#' + $(this).val();
              // set the option_not_selected variable
              option_not_selected = $(this).not(':selected');

              if ("console" in window) {
              	console.log(target_fieldset_id);
              }

              // if the option isn't selected, hide the correspondent fieldset
              if (option_not_selected.length && $(this).val()) {
                $(target_fieldset_id).hide();
              } else if ($(this).val()) {
                $(target_fieldset_id).show();
              }

            });
          };
          // rerun the init_select function on change 
          $('#countdown_type').change(function() {
            //init_select();
          });

          //init_select();

          /*
          //////////
            conditional input toggle
          //////////
          */
        });

		  //]]>
    </script>
  </head>
  <body>
    <div id="wrapper" class="container">
      <div id="header">
        <h1>Firefox Tweet Machine - Manage</h1>
        <p><a href="?action=logout" title="close your session">Logout</a></p>
        <p class="messages <? print(reset(array_keys($flash))) ?>"><? print(reset($flash)); ?></p>
      </div>
      <div id="body">
        <h2>Settings</h2>

        <form action="/manage.php" method="post">
          <fieldset>
            <legend>Admin</legend>

            <label for="allowed_admins">Allowed Administrators</label>
            <input id="allowed_admins" name="allowed_admins" type="text" size="100" value="<? print $config['allowed_admins']; ?>"/>
            <p class="field description">comma separated list of twitter usernames allowed in the administration interface</p>
          </fieldset>

          <fieldset>
            <legend>Twitter</legend>
            
            <fieldset>
              <legend>Whitelisted User Details</legend>
              <p class="description">account credentials for the username used to request data to twitter, typically this should be a whitelisted user</p>
              
              <label for="whitelisted_username">User</label>
              <input id="whitelisted_username" name="whitelisted_username" type="text" value="<? print $config['whitelisted_username']; ?>"/>
              <br />
  
              <label for="whitelisted_password">Password</label>
              <input id="whitelisted_password" name="whitelisted_password" type="password" value="<? print $config['whitelisted_password']; ?>"/>
              <br />
            </fieldset>

            <fieldset>
              <legend>Timeline</legend>
              <p class="description">tweets from the specified user's timeline will be displayed along with search results, tweet count will limit the amount of twets to fetch</p>

              <label for="timeline_username">User</label>
              <input id="timeline_username" name="timeline_username" type="text" value="<? print $config['timeline_username']; ?>" />
              <br />

              <label for="timeline_count">Tweet Count</label>
              <input id="timeline_count" name="timeline_count" type="text" value="<? print $config['timeline_count']; ?>" />
              <br />

<!--
              <label for="timeline_url">Timeline URL</label>
              <input id="timeline_url" name="timeline_url" type="text" size="100" value="<? print $config['timeline_url']; ?>" />
              <br />
-->
            </fieldset>

            <fieldset>
              <legend>Search</legend>
              <p class="description">configure the search results that will be presented to the user by default</p>

              <label for="search_default_keyword">Keyword</label>
              <input id="search_default_keyword" name="search_default_keyword" type="text" value="<? print $config['search_default_keyword'] ?>" />
              <br />

              <label for="search_results_per_page">Results Count</label>
              <input id="search_results_per_page" name="search_results_per_page" type="text" value="<? print $config['search_results_per_page'] ?>" />
              <br />
<!--

              <label for="search_url">Search URL</label>
              <input id="search_url" name="search_url" type="text" size="100" value="<? print $config['search_url']; ?>" />
              <br />
-->
            </fieldset>

          </fieldset>
         
          <fieldset>
            <legend>Triggers</legend>
            <p class="description">conditions to spawn the special bubbles and configure downtown display</p>

            <fieldset>
              <legend>Special Bubbles</legend>
              <p class="description">bubbles are spawned according to the following rules</p>

                <label for="specialbubble_timeline_step">Timeline Step</label>
                <input id="specialbubble_timeline_step" name="specialbubble_timeline_step" type="text" size="100" value="<? print $config['specialbubble_timeline_step']; ?>"/>
                <p class="field description">spawn a timeline bubble after X search results</p>
                <br />

                <label for="specialbubble_followers_step">Followers Step</label>
                <input id="specialbubble_followers_step" name="specialbubble_followers_step" type="text" size="100" value="<? print $config['specialbubble_followers_step']; ?>"/>
                <p class="field description">announce followers bubble at each X new followers</p>
                <br />

                <label for="specialbubble_clock_step">Clock Step</label>
                <input id="specialbubble_clock_step" name="specialbubble_clock_step" type="text" size="100" value="<? print $config['specialbubble_clock_step']; ?>"/>
                <p class="field description">announce time each X minutes</p>
                <br />

                <label for="specialbubble_firefox_downloads_step">Downloads Step</label>
                <input id="specialbubble_firefox_downloads_step" name="specialbubble_firefox_downloads_step" type="text" size="100" value="<? print $config['specialbubble_firefox_downloads_step']; ?>"/>
                <p class="field description">spawn a downloads bubble after X new downloads</p>
                <br />


            </fieldset>

            <fieldset>
              <legend>Countdown Display</legend>

              <label for="countdown_display_type">Type</label>
              <select id="countdown_display_type" name="countdown_display_type">
                <option value=""></option>
                <option value="datetime" <? if ($config['countdown_display_type'] == 'datetime') { print 'selected'; } ?>>Date</option>
                <option value="followers" <? if ($config['countdown_display_type'] == 'followers') { print 'selected'; } ?>>Followers</option>
              </select>
              <p class="field description">select either Date or Followers countdown type</p>
              <br />

              <fieldset id="datetime">
                <legend>Date</legend>

                <label for="countdown_display_datetime">Trigger Date</label>
                <input id="countdown_display_datetime" name="countdown_display_datetime" type="text" size="100" value="<? print $config['countdown_display_datetime']; ?>"/>
                <br />
                <label for="countdown_display_datetime_description">Description</label>
                <input id="countdown_display_datetime_description" name="countdown_display_datetime_description" type="text" size="100" value="<? print $config['countdown_display_datetime_description']; ?>"/>
                <br />
                <label for="countdown_display_datetime_reached">Reached</label>
                <input id="countdown_display_datetime_reached" name="countdown_display_datetime_reached" type="text" size="100" value="<? print $config['countdown_display_datetime_reached']; ?>"/>

              </fieldset>

              <fieldset id="followers">
                <legend>Followers</legend>

                <label for="countdown_display_followers">Milestone</label>
                <input id="countdown_display_followers" name="countdown_display_followers" type="text" size="100" value="<? print $config['countdown_display_followers']; ?>"/>
                <br />
                <label for="countdown_display_followers_description">Description</label>
                <input id="countdown_display_followers_description" name="countdown_display_followers_description" type="text" size="100" value="<? print $config['countdown_display_followers_description']; ?>"/>

              </fieldset>

            </fieldset>

          </fieldset>
          
          <fieldset>
            <legend>Keywords</legend>
            
            <fieldset>
              <legend>Highlights</legend>
              
              <label for="keywords_highlights_green">Green</label>
              <input id="keywords_highlights_green" name="keywords_highlights_green" type="text" size="100" value="<? print $config['keywords_highlights_green']; ?>"/>
              <br />

              <label for="keywords_highlights_orange">Orange</label>
              <input id="keywords_highlights_orange" name="keywords_highlights_orange" type="text" size="100" value="<? print $config['keywords_highlights_orange']; ?>"/>
              <br />
              
              <label for="keywords_highlights_pink">Pink</label>
              <input id="keywords_highlights_pink" name="keywords_highlights_pink" type="text" size="100" value="<? print $config['keywords_highlights_pink']; ?>"/>
              <br />
              
              <label for="keywords_highlights_violet">Violet</label>
              <input id="keywords_highlights_violet" name="keywords_highlights_violet" type="text" size="100" value="<? print $config['keywords_highlights_violet']; ?>"/>
              <br />

            </fieldset>

            <label for="keywords_excluded">Excluded</label>
            <input id="keywords_excluded" name="keywords_excluded" type="text" size="100" value="<? print $config['keywords_excluded']; ?>"/>
            <p class="field description">excluded keywords will be replaced by random characters</p>
            
          </fieldset>

          <fieldset>
            <legend>Stats</legend>

            <label for="firefox_tweet_machine_stats_url">Twitter/Facebook Stats URL</label>
            <input id="firefox_tweet_machine_stats_url" name="firefox_tweet_machine_stats_url" type="text" size="100" value="<? print $config['firefox_tweet_machine_stats_url']; ?>"/>
            <p class="field description">URL for which to fetch stats</p>
            <br />

            <label for="firefox_download_stats_url">Firefox Downloads Source URL</label>
            <input id="firefox_download_stats_url" name="firefox_download_stats_url" type="text" size="100" value="<? print $config['firefox_download_stats_url']; ?>"/>
            <p class="field description">URL for the firefox download stats json</p>
            <br />

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
            <p class="field description">if enabled, the FTM client will attempt to fetch new data from twitter if there's none cached</p>
            <br/>

            <label for="cron_url">URL</label>
            <input id="cron_url" name="cron_url" type="text" size="100" value="<? print $config['cron_url']; ?>" />
            <p class="field description">url of the cron.php script</p>
            <br/>
          </fieldset>
          
          <fieldset>
            <legend>Other</legend>
            
            <label for="fftm_version">FTM Version</label>
            <input id="fftm_version" name="fftm_version" type="text" value="<? print $config['fftm_version']; ?>"/>
          </fieldset>

          <button>Save</button>
        </form>
			</div>
      <div id="footer">
        <pre><? //print_r($config) ?></pre>
      </div>
    </div>
  </body>
</html>