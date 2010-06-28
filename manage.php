<?
  // auth real
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
/*   echo 'Your are logged in as: ' . $data['username']; */
  $content = 'logged in';
  
  
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
      <div id="header">Firefox Tweet Machine - Admin</div>
      <div id="body">
        <? print($content) ?>
			</div>
      <div id="footer">&copy; <? print date('Y') ?> - Mozilla</div>
    </div>
  </body>
</html>