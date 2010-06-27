<?php

$memcache = new Memcache;
$memcache->connect('localhost', 11211) or die ("Could not connect");

$version = $memcache->getVersion();
$ttl = 10;
echo "Server's version: ".$version."<br/>\n";

$tmp_object = new stdClass;
$tmp_object->str_attr = 'test string';
$tmp_object->int_attr = 123;

$memcache->set('key', $tmp_object, false, $ttl) or die ("Failed to save data at the server");
echo "Store data in the cache (data will expire in " . $ttl . " seconds)<br/>\n";

$get_result = $memcache->get('key');
echo "Data from the cache:<br/>\n";

var_dump($get_result);

?>