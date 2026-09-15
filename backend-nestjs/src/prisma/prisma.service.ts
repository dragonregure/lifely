import { Injectable } from '@nestjs/common';
import { db } from './db.js';

export const User = db.orm.public.User;
export const Tenant = db.orm.public.Tenant;
export const Contact = db.orm.public.Contact;
export const Listing = db.orm.public.Listing;
export const Lead = db.orm.public.Lead;
export const ListingContact = db.orm.public.ListingContact;
export const ListingUser = db.orm.public.ListingUser;
export const Document = db.orm.public.Document;
export const PersonalAccessToken = db.orm.public.PersonalAccessToken;
export const Permission = db.orm.public.Permission;
export const Role = db.orm.public.Role;
export const RoleHasPermission = db.orm.public.RoleHasPermission;
export const ModelHasRole = db.orm.public.ModelHasRole;
export const ModelHasPermission = db.orm.public.ModelHasPermission;

@Injectable()
export class PrismaService {
  User() {
    return User;
  }

  Tenant() {
    return Tenant;
  }

  Contact() {
    return Contact;
  }

  Listing() {
    return Listing;
  }

  Lead() {
    return Lead;
  }

  ListingContact() {
    return ListingContact;
  }

  ListingUser() {
    return ListingUser;
  }

  Document() {
    return Document;
  }

  PersonalAccessToken() {
    return PersonalAccessToken;
  }

  Permission() {
    return Permission;
  }

  Role() {
    return Role;
  }

  RoleHasPermission() {
    return RoleHasPermission;
  }

  ModelHasRole() {
    return ModelHasRole;
  }

  ModelHasPermission() {
    return ModelHasPermission;
  }
}
