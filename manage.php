<?
  // set the flash messages array
  $flash = array();
  // include config file loader
  require_once "yaml_loader.php";
  // settings filename
  $settings_filename = 'ftm_config.yaml';


  // AUTH - START ###########################################################################

  include_once('auth.php');

  // AUTH - END ###########################################################################

  // write the settings if we received $_POST content
  if ($_POST) {

    // check if the file is writable
      if (is_writable($settings_filename)) {

          // include "A simple YAML loader/dumper" named spyc
          require_once "spyc.php";
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

  // include config file loader
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
          // make me do stuff!
        });

		  //]]>
    </script>
  </head>
  <body>
    <div id="wrapper" class="container">
      <div id="header">
        <h1>Firefox Tweet Machine - Admin</h1>
        <p class="messages <? print(reset(array_keys($flash))) ?>"><? print(reset($flash)); ?></p>
      </div>
      <div id="body">
        <h2>Settings</h2>

        <form action="/manage.php" method="post">
          <fieldset>
            <legend>Admin</legend>

            <label for="admin_username">Username</label>
            <input id="admin_username" name="admin_username" type="text" value="<? print $config['admin_username']; ?>"/>
            <br />
            <label for="admin_password">Password</label>
            <input id="admin_password" name="admin_password" type="password" value="<? print $config['admin_password']; ?>"/>
          </fieldset>

          <?
            // 
            // only display the rest of the form when admin user is set
            if ($config['admin_username'] && $config['admin_password']) :
          ?>


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
              <legend>Firefox</legend>

              <label for="firefox_download_stats_url">Downloads URL</label>
              <input id="firefox_download_stats_url" name="firefox_download_stats_url" type="text" size="100" value="<? print $config['firefox_download_stats_url']; ?>"/>
              <br />

              <label for="firefox_follower_milestone">Follower Milestone</label>
              <input id="firefox_follower_milestone" name="firefox_follower_milestone" type="text" size="100" value="<? print $config['firefox_follower_milestone']; ?>"/>
              <br />


              <label for="firefox_download_step">Downloads Step</label>
              <input id="firefox_download_step" name="firefox_download_step" type="text" size="100" value="<? print $config['firefox_download_step']; ?>"/>
              <br />
            </fieldset>

            <label for="">Clock Step</label>
            <input id="clock_step" name="clock_step" type="text" size="100" value="<? print $config['clock_step']; ?>"/>
            <br />

            <fieldset>
              <legend>Countdown</legend>
              
              <label for="">Date</label>
              <input id="countdown_date" name="countdown_date" type="text" size="100" value="<? print $config['countdown_date']; ?>"/>
              <br />
    
              <label for="">Type</label>
              <select id="countdown_type" name="countdown_type">
                <option value=""></option>
                <option value="event" <? if ($config['countdown_type'] == 'event') { print 'selected'; } ?>>Event</option>
              </select>
              <br />
            </fieldset>

          </fieldset>
          
          <? endif // end admin user conditional ?>
          
          <button>Save</button>
        </form>
			</div>
      <div id="footer">
        <pre><? print_r($config) ?></pre>
      </div>
    </div>
  </body>
</html>