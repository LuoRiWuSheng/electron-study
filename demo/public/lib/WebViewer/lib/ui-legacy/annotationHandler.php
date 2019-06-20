<?php
/**
 * annotationHandler.php
 * This PHP script is a sample of basic server-side annotation handling.
 * When WebViewer makes a POST request with annotations to save, this script will save the annotations to a file.
 * When WebViewer makes a GET request to load the annotations, this script will fetch the annotations from the file and return it.
 * Note that this is only a sample and does not take account of security and concurrency.
 *
 * For production, please consider the following:
 * 1. Your server should assign a document identifier 'did' to the WebViewer. When saving and loading annotations, use this 'did' to uniquely identify the annotation file to use.
 * 2. You may also want to use 'did' as a session token, in order to authenticate the client user.
 * 3. You may want to consider a better storage for your annotation file (e.g. save the annotation in a database)
 **/

//Cookie handler
if(!isset($_COOKIE['cookie_id'])){
	$cookie_id = uniqid();
	setcookie ("cookie_id", $cookie_id, time() +86400, "/");
}else{
	$cookie_id = $_COOKIE['cookie_id'];
}


if (!is_dir("annotations")) {
  // dir doesn't exist, make it
  mkdir("annotations");
}

if (!is_dir("annotations/{$cookie_id}")) {
  // dir doesn't exist, make it
  mkdir("annotations/{$cookie_id}");
}
//Simple annotation handler
if(isset($_REQUEST['did']) && $_REQUEST['did'] != "null"){
    //get the document id
    $did = $_REQUEST['did'];
    //Use did to authenticate user
    $xfdf_file = "annotations/{$cookie_id}/".$did.".xfdf";
} else{
    $xfdf_file = "annotations/{$cookie_id}/default.xfdf";
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    //POST request
    if(isset($_POST['data'])){

        if (get_magic_quotes_gpc()) {
            $xfdfData = stripslashes($_POST['data']);
        } else{
            $xfdfData = $_POST['data'];
        }

        if(file_put_contents($xfdf_file, $xfdfData)){
            //save successful
            //echo $xfdf_file;
        }else{
            header("HTTP/1.1 500 Internal Server Error");
        }
    }
} else{
    //GET request
    if(file_exists($xfdf_file)){
        header("Content-type: text/xml");
        echo file_get_contents($xfdf_file);
    }else{
        header("HTTP/1.1 204 No Content");
    }

}
?>