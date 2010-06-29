<?
  // auth realm that'll be displayed in the auth dialog
  $realm = 'Restricted area';

  //user => password
  $users = array($config['admin_username'] => $config['admin_password']);

  // of there's no http auth session
  if (empty($_SERVER['PHP_AUTH_DIGEST'])) {
      header('HTTP/1.1 401 Unauthorized');
      header('WWW-Authenticate: Digest realm="'.$realm.
             '",qop="auth",nonce="'.uniqid().'",opaque="'.md5($realm).'"');

      die('Access Denied');
  }

  // analyze the PHP_AUTH_DIGEST variable
  if (!($data = http_digest_parse($_SERVER['PHP_AUTH_DIGEST'])) ||
      !isset($users[$data['username']]))
      die('Wrong Credentials! (PHP_AUTH_DIGEST)');

  // generate the valid response
  $A1 = md5($data['username'] . ':' . $realm . ':' . $users[$data['username']]);
  $A2 = md5($_SERVER['REQUEST_METHOD'].':'.$data['uri']);
  $valid_response = md5($A1.':'.$data['nonce'].':'.$data['nc'].':'.$data['cnonce'].':'.$data['qop'].':'.$A2);

  // check for valid auth
  if ($data['response'] != $valid_response)
      die('Wrong Credentials! (bad response)');

  // ok, valid username & password
/*   $flash['notice'] = 'Your are logged in as: ' . $data['username']; */



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