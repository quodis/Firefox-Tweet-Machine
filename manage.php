<?
  // set the flash messages array
  $flash = array();
  // include config file loader
  require_once "yaml_loader.php";
  // settings filename
  $settings_filename = 'ftm_config.yml';

  // AUTH - START ###########################################################################

  // logout
  if ($_GET['action'] == 'logout') {
    setcookie('fftm_tok', '');
    setcookie('fftm_sec', '');
    die(header('refresh:0;url=manage.php'));
  };

  include 'admin/EpiCurl.php';
  include 'admin/EpiOAuth.php';
  include 'admin/EpiTwitter.php';
  include 'admin/secret.php';
  
  $twitterObj = new EpiTwitter($consumer_key, $consumer_secret);
  
  // only when returning from twitter
  if ($_GET['oauth_token']) {
    $twitterObj->setToken($_GET['oauth_token']);
    $token = $twitterObj->getAccessToken();
    // save token and secret using cookies
    setcookie('fftm_tok', $token->oauth_token, time() + (3600 * 7), '/', $_SERVER['SERVER_ADDR'], false, true);
    setcookie('fftm_sec', $token->oauth_token_secret, time() + (3600 * 7), '/', $_SERVER['SERVER_ADDR'], false, true);
    
    // TODO: on first login (ie: no config file exists) try create it and add the current user to the allowed_admins
    if (is_writable($settings_filename)) {
      
    }
  }

  // set token either from GET or stored COOKIE values
  $twitterObj->setToken(($token->oauth_token) ? $token->oauth_token : $_COOKIE['fftm_tok'] , ($token->oauth_token_secret) ? $token->oauth_token_secret : $_COOKIE['fftm_sec']);
  // authenticate with twitter
  $twitterInfo= $twitterObj->get_accountVerify_credentials();
  $twitterInfo->response;

  // die if not athorized
  if ( !in_array( strtolower($twitterInfo->screen_name), explode(',', strtolower($config['allowed_admins']) ) ) ) {
    die('<a href="' . $twitterObj->getAuthorizationUrl() . '">Authorize with Twitter</a>');
  }

  // AUTH - END ###########################################################################

  // write the settings if we received $_POST content
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
  require "yaml_loader.php";
?>
<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>FTM - Admin</title>
    <link rel="shortcut icon" href="PathToFavIcon" />
    <link rel="apple-touch-icon" href="PathToapple-touch-icon.png" />
    <style type="text/css" media="all">
			<!--

			-->
    </style>
    <link href="css/blueprint/src/reset.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="css/blueprint/src/grid.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="css/blueprint/src/forms.css" media="screen" rel="stylesheet" type="text/css" />
    <link href="css/blueprint/src/typography.css" media="screen" rel="stylesheet" type="text/css" />

    <script src="lib/jquery-1.4.2.min.js"></script>

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
            $('#countdown_type option').each(function() {
              // build the id of the input to be manipulated
              target_fieldset_id = '#' + $(this).val();
              // set the option_not_selected variable
              option_not_selected = $(this).not(':selected');

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
            init_select();
          });

          init_select();

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
        <h1>Firefox Tweet Machine - Admin</h1>
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
          </fieldset>

          <fieldset>
            <legend>Twitter:</legend>

            <fieldset>
              <legend>Timeline</legend>

              <label for="timeline_username">Default Screen Name</label>
              <input id="timeline_username" name="timeline_username" type="text" value="<? print $config['timeline_username']; ?>" />
              <br />

              <label for="timeline_count">Timeline Tweet Count</label>
              <input id="timeline_count" name="timeline_count" type="text" value="<? print $config['timeline_count']; ?>" />
              <br />

              <label for="timeline_url">Timeline URL</label>
              <input id="timeline_url" name="timeline_url" type="text" size="100" value="<? print $config['timeline_url']; ?>" />
              <br />
            </fieldset>

            <fieldset>
              <legend>Search</legend>

              <label for="search_default_keyword">Default Search Keyword</label>
              <input id="search_default_keyword" name="search_default_keyword" type="text" value="<? print $config['search_default_keyword'] ?>" />
              <br />

              <label for="search_results_per_page">Results per Page</label>
              <input id="search_results_per_page" name="search_results_per_page" type="text" value="<? print $config['search_results_per_page'] ?>" />
              <br />

              <label for="search_url">Search URL</label>
              <input id="search_url" name="search_url" type="text" size="100" value="<? print $config['search_url']; ?>" />
              <br />
            </fieldset>

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
            <input id="cron_url" name="cron_url" type="text" size="100" value="<? print $config['cron_url']; ?>" />
            <br/>
          </fieldset>

          <fieldset>
            <legend>Other</legend>

            <fieldset>
              <legend>Downloads</legend>

              <label for="firefox_download_stats_url">Downloads URL</label>
              <input id="firefox_download_stats_url" name="firefox_download_stats_url" type="text" size="100" value="<? print $config['firefox_download_stats_url']; ?>"/>
              <br />

              <label for="firefox_download_step">Downloads Step</label>
              <input id="firefox_download_step" name="firefox_download_step" type="text" size="100" value="<? print $config['firefox_download_step']; ?>"/>
              <br />
            </fieldset>

            <fieldset>
              <legend>Special Bubbles</legend>
              
              <label for="firefox_follower_milestone">Follower Milestone</label>
              <input id="firefox_follower_milestone" name="firefox_follower_milestone" type="text" size="100" value="<? print $config['firefox_follower_milestone']; ?>"/>
              <br />

              <label for="clock_step">Clock Step</label>
              <input id="clock_step" name="clock_step" type="text" size="100" value="<? print $config['clock_step']; ?>"/>
              <br />
            </fieldset>

            <fieldset>
              <legend>Countdown</legend>

              <label for="countdown_type">Type</label>
              <select id="countdown_type" name="countdown_type">
                <option value=""></option>
                <option value="event" <? if ($config['countdown_type'] == 'event') { print 'selected'; } ?>>Event</option>
                <option value="downloads" <? if ($config['countdown_type'] == 'downloads') { print 'selected'; } ?>>Downloads</option>
              </select>
              <br />

              <fieldset id="event">
                <legend>Date Trigger</legend>

                <label for="countdown_trigger_date">Trigger</label>
                <input id="countdown_trigger_date" name="countdown_trigger_date" type="text" size="100" value="<? print $config['countdown_trigger_date']; ?>"/>
                <br />
                <label for="countdown_trigger_date_description">Description</label>
                <input id="countdown_trigger_date_description" name="countdown_trigger_date_description" type="text" size="100" value="<? print $config['countdown_trigger_date_description']; ?>"/><br />

              </fieldset>

              <fieldset id="downloads">
                <legend>Download Count Trigger</legend>

                <label for="countdown_trigger_downloads">Trigger</label>
                <input id="countdown_trigger_downloads" name="countdown_trigger_downloads" type="text" size="100" value="<? print $config['countdown_trigger_downloads']; ?>"/>
                <br />
                <label for="countdown_trigger_downloads_description">Description</label>
                <input id="countdown_trigger_downloads_description" name="countdown_trigger_downloads_description" type="text" size="100" value="<? print $config['countdown_trigger_downloads_description']; ?>"/>

              </fieldset>

            </fieldset>

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