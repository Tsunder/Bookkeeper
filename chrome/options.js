// -*- js3-indent-level: 8; js3-indent-tabs-mode: t -*-

document.addEventListener( 'DOMContentLoaded', onDOMContentLoaded, false );

function onDOMContentLoaded() {
	var version_span = document.getElementById( 'bookkeeper-version' ),
	    clear_button = document.getElementById( 'bookkeeper-clear-button' );
	version_span.textContent = chrome.runtime.getManifest().version;

	clear_button.addEventListener( 'click', onClearClick, false );

	if ( typeof chrome.storage.sync.getBytesInUse === 'function' ||
	     typeof chrome.storage.sync.MAX_ITEMS === 'number' ||
	     typeof chrome.storage.sync.QUOTA_BYTES === 'number' )
		beginUsageDisplayChore();


	// Else we're on Firefox or something else that doesn't support Chrome's
	// full storage API.  We won't even try, let's just hide the whole
	// thing.
	document.getElementById( 'bookkeeper-storage-gauge' ).
		parentElement.remove();
}

function beginUsageDisplayChore() {
	// This is ugly, we don't need to fetch everything, just count it.
	// There should be a chrome.storage.sync.getItemCount() or something.
	chrome.storage.sync.get( null, onItems );
}

function onItems( items ) {
	var count = Object.keys( items ).length;
	chrome.storage.sync.getBytesInUse(null,
					  onKnownBytesInUse.bind(null, count));
}

function onKnownBytesInUse( item_count, bytes ) {
	var usage_span = document.getElementById( 'bookkeeper-item-usage' ),
	    quota_span = document.getElementById( 'bookkeeper-item-quota' ),
	    byte_usage_span = document.getElementById( 'bookkeeper-byte-usage' ),
	    byte_quota_span = document.getElementById( 'bookkeeper-byte-quota' ),
	    gauge = document.getElementById( 'bookkeeper-storage-gauge' ),
	    item_quota = chrome.storage.sync.MAX_ITEMS,
	    byte_quota = chrome.storage.sync.QUOTA_BYTES;

	usage_span.textContent = item_count;
	quota_span.textContent = item_quota;
	byte_usage_span.textContent = bytes;
	byte_quota_span.textContent = byte_quota;

	// Let the gauge show the direst of these two
	gauge.value = Math.max( item_count / item_quota, bytes / byte_quota );
}

// What a faff. All I wanted was window.confirm(), but can't use that in the
// options page <_<
var clearButtonRestoreTimeout;
function onClearClick() {
	this.disabled = true;

	if( clearButtonRestoreTimeout ) {
		window.clearTimeout( clearButtonRestoreTimeout );
		clearButtonRestoreTimeout = undefined;
	}

	if( this.dataset.state != 'confirming' ) {
		this.textContent = "Clear storage and untrack all buildings. Are you sure?";
		window.setTimeout( reenable.bind(this), 2000 );
	}
	else {
		chrome.storage.sync.clear( onStorageNuked.bind(this) );
		this.textContent = 'Clearing...';
	}

	function reenable() {
		this.dataset.state = 'confirming';
		this.disabled = false;
		clearButtonRestoreTimeout = window.setTimeout( restore.bind(this), 3000 );
	}

	function restore() {
		this.dataset.state = null;
		this.disabled = false;
		this.textContent = 'Clear storage';
		clearButtonRestoreTimeout = undefined;
	}

	function onStorageNuked() {
		restore.call( this );
		beginUsageDisplayChore();
	}
}
