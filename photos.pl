#!/usr/bin/env perl
# brew install libde265
# brew install --with-libde265 imagemagick
use Mojolicious::Lite;

use Mojo::File qw(path tempfile);

$ENV{HOME}       ||= '.';
$ENV{PHOTOS_DIR} ||= path $ENV{HOME};

$ENV{PHOTOS_TEMP} ||= path(File::Spec->tmpdir, 'photos');
mkdir $ENV{PHOTOS_TEMP} unless -d $ENV{PHOTOS_TEMP};

app->types->type(heic => 'image/heic');
app->types->type(mov  => 'video/quicktime');
app->plugin(Webpack => {process => [qw(js css sass)]});

helper file_class_name => sub {
  my @type = split '/', (shift->mime_type(shift) || '');
  return @type ? sprintf 'file-family-%s file-type-%s', @type : 'file-unknown';
};

helper mime_type => sub {
  my ($c, $file) = @_;
  return 'directory/directory' if -d $file;
  return $c->app->types->type(
    $file->basename =~ m!\.(\w+)$! ? lc $1 : 'unknown')
    || '';
};

helper photos => sub { state $p = path $ENV{PHOTOS_DIR} };

get '/*path' => {path => ''} => sub {
  my $c = shift;

  my $vpath = Mojo::Path->new($c->stash('path'))->canonicalize;
  $c->stash(vpath => $vpath);
  $c->stash(dpath => $c->photos->child(split '/', $vpath));
  $vpath->trailing_slash(1);
  $vpath->leading_slash(1) if length($vpath) > 1;

  return render_dir($c)  if -d $c->stash('dpath');
  return render_file($c) if -e $c->stash('dpath');
  return $c->reply->not_found;
};

del '/*path' => {path => ''} => sub {
  my $c       = shift;
  my $vpath   = Mojo::Path->new($c->stash('path'))->canonicalize;
  my $dpath   = $c->photos->child(split '/', $vpath);
  my $deleted = undef;

  # Undelete
  if ($vpath->[-1] =~ s!^del-!!) {
    $deleted = 0;
    rename $dpath, $c->photos->child(split '/', $vpath);
  }

  # Delete
  else {
    $vpath->[-1] = "del-$vpath->[-1]";
    $deleted = 1;
    rename $dpath, $c->photos->child(split '/', $vpath);
  }

  $vpath->leading_slash(1);
  $c->render(
    json => {deleted => $deleted, name => $vpath->[-1], path => $vpath});
};

app->start;

sub render_dir {
  my $c     = shift;
  my $vpath = $c->stash('vpath');

  my %types;
  $c->stash('dpath')->list({dir => 1})->each(sub {
    my $file = shift;
    my $name = $file->basename;
    my $type = (split '/', $c->mime_type($file))[0] || 'unknown';

    my $id = join '_', $type, $name;
    $id =~ s!\W!-!g;

    push @{$types{$type}},
      {
      deleted => $name =~ m!\.del\.! ? 1 : 0,
      href    => $vpath->clone->merge($name),
      id      => $id,
      name    => $name,
      path    => $file
      };
  });

  $c->render('dir', types => \%types);
}

sub render_file {
  my $c     = shift->render_later;
  my $dpath = $c->stash('dpath');
  my $type  = $c->mime_type($dpath);

  $c->res->headers->cache_control('max-age=600');

  if ($dpath =~ m!\.heic$!i) {
    my $temp = tempfile(DIR => $ENV{PHOTOS_TEMP}, SUFFIX => '.jpeg');
    Mojo::IOLoop->subprocess(
      sub {
        my @cmd = (convert => $dpath => $temp);
        $c->app->log->debug(join ' ', '$', @cmd);
        return system @cmd;
      },
      sub {
        $c->res->headers->content_type('image/jpeg');
        $c->reply->asset(Mojo::Asset::File->new(path => $temp));
        $c->tx->on(finish => sub { unlink $temp });
      },
    );
  }
  else {
    $c->res->headers->content_type($type) if $type;
    $c->reply->asset(Mojo::Asset::File->new(path => $dpath));
  }
}

__DATA__
@@ dir.html.ep
<html>
<head>
  <title>Photos - <%= $vpath %></title>
  %= asset 'photos.css'
</head>
<body>
  <div class="container">
    <div class="browser">
      <h1>
        % my @path = @$vpath;
        % my $i = 0;
        %= link_to 'M:', '/', class => (@path <= 1 ? 'up' : '')
        <span>/</span>
        % while ($i < @path) {
          % my @class = $i + 2 == @path ? 'up' : '';
          %= link_to $path[$i], join('/', '', @path[0..$i]), class => @class;
          % if (++$i < @path) {
            <span>/</span>
          % }
        % }
      </h1>
      % my $n = 0;
      % for my $type (sort keys %$types) {
        <h2>
          <small>(<%= int @{$types->{$type}} %>)</small>
          <a class="type" href="#<%= $type %>"><%= ucfirst $type %></a>
        </h2>
        <ul class="browser_files type-<%= $type %>">
          % for my $file (@{$types->{$type}}) {
            % my @cn = ('file', file_class_name $file->{path});
            % push @cn, 'deleted' if $file->{deleted};
            <li><a id="<%= $file->{id} %>" class="<%= join ' ', @cn %>" href="<%= $file->{href} %>"><%= $file->{name} %></a></li>
          % }
        </ul>
        % }
      </ul>
    </div>
    <div class="preview rotate-0">
      <img alt="Could not preview photo." src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=">
      <div class="preview_loader"><span class="one"></span><span class="two"></span><span class="three"></span></div>
    </div>
  </div>
  %= asset 'photos.js'
</body>
